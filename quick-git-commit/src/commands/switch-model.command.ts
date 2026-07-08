import * as vscode from 'vscode';
import { ConfigService } from '../config';
import { AIServiceFactory } from '../ai/ai-service.factory';
import { AI_CONSTANTS, CONFIG_CONSTANTS } from '../constants';

export class SwitchModelCommand {
    constructor(private readonly configService: ConfigService) { }

    public async execute(): Promise<void> {
        try {
            const config = this.configService.getExtensionConfig();

            // Only OpenAI supports listing models via API
            if (config.provider !== CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
                vscode.window.showInformationMessage(AI_CONSTANTS.ERROR.UNSUPPORTED_PROVIDER);
                return;
            }

            if (!config.openai.baseUrl) {
                vscode.window.showErrorMessage(AI_CONSTANTS.ERROR.NO_BASE_URL);
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: AI_CONSTANTS.PROGRESS.LOADING_MODELS,
                cancellable: false
            }, async () => {
                await this.handleModelSwitch();
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(
                vscode.l10n.t("Error executing command: {0}", error.message)
            );
        }
    }

    private async handleModelSwitch(): Promise<void> {
        try {
            const aiService = AIServiceFactory.getAIService();

            if (!aiService.getAvailableModels) {
                vscode.window.showInformationMessage(AI_CONSTANTS.ERROR.UNSUPPORTED_PROVIDER);
                return;
            }

            const models = await aiService.getAvailableModels();
            if (models.length === 0) {
                vscode.window.showInformationMessage(AI_CONSTANTS.ERROR.NO_AVAILABLE_MODELS);
                return;
            }

            const items = models.map(model => ({
                label: model.id,
                description: model.owner_by,
                detail: vscode.l10n.t("Created at: {0}", new Date(model.created * 1000).toLocaleDateString()),
                model
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: AI_CONSTANTS.UI.MODEL_SELECTION_PLACEHOLDER,
                title: AI_CONSTANTS.UI.MODEL_SELECTION_TITLE
            });

            if (selected) {
                await vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT).update(
                    CONFIG_CONSTANTS.OPENAI.MODEL,
                    selected.model.id,
                    vscode.ConfigurationTarget.Global
                );
                AIServiceFactory.resetInstance();
                vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.SWITCH_MODEL);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`${AI_CONSTANTS.ERROR.LOAD_MODELS}: ${error.message}`);
        }
    }
}
