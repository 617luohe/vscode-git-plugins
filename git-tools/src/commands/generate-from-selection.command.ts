import * as vscode from 'vscode';
import { GitService } from '../git';
import { ConfigService } from '../config';
import { AIServiceFactory } from '../ai/ai-service.factory';
import { AI_CONSTANTS, GIT_CONSTANTS } from '../constants';
import { ExtensionConfig } from '../types/config';
import { Repository } from '../types/git';
import { TextUtils } from '../utils/text-utils';
import { normalizeToUris } from '../utils/normalize-selection';
import { Logger } from '../utils/logger';

export class GenerateFromSelectionCommand {
    constructor(private readonly configService: ConfigService) { }

    /**
     * Entry point invoked from the SCM resource context menu.
     * VS Code passes the clicked resource first, then (on multi-select) the
     * full selection as an array in a later argument.
     */
    public async execute(...args: unknown[]): Promise<void> {
        try {
            const uris = normalizeToUris(args);
            Logger.log(`[GenerateFromSelection] resolved ${uris.length} file(s)`);

            if (uris.length === 0) {
                vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_SELECTION);
                return;
            }

            const repository = await GitService.getRepositoryForUri(uris[0]);
            if (!repository || !repository.rootUri) {
                vscode.window.showErrorMessage(GIT_CONSTANTS.ERROR.NO_REPOSITORY);
                return;
            }

            const config = this.configService.getExtensionConfig();
            if (!(await this.configService.checkAIConfig(config, config.provider))) {
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.SourceControl,
                title: AI_CONSTANTS.PROGRESS.TITLE,
                cancellable: false
            }, async () => {
                await this.run(repository, uris, config);
            });
        } catch (error: any) {
            Logger.error('[GenerateFromSelection] Unexpected error', error);
            vscode.window.showErrorMessage(vscode.l10n.t("Error executing command: {0}", error.message));
        }
    }

    /**
     * Core flow: (optional) stage → diff → AI stream → write input box.
     */
    private async run(repository: Repository, uris: vscode.Uri[], config: ExtensionConfig): Promise<void> {
        const fsPaths = uris.map(u => u.fsPath);

        // Auto-stage first (if enabled) so the diff and the commit target agree.
        if (config.autoStageSelectedFiles) {
            try {
                await GitService.stageFiles(repository, fsPaths);
            } catch {
                // Non-fatal: continue to generate the message even if staging fails.
            }
        }

        const diff = await GitService.getDiffForFiles(repository, fsPaths, config.git.untrackedFileMaxBytes);
        if (!diff) {
            vscode.window.showInformationMessage(GIT_CONSTANTS.ERROR.NO_CHANGES, { modal: true });
            return;
        }

        const aiService = AIServiceFactory.getAIService();
        try {
            const stream = aiService.generateCommitMessage(diff, config.language);
            let aggregated = '';
            for await (const chunk of stream) {
                aggregated += chunk;
                repository.inputBox.value = aggregated;
            }
            repository.inputBox.value = TextUtils.removeCodeBlockMarkers(aggregated.trim());
            vscode.window.showInformationMessage(AI_CONSTANTS.SUCCESS.GENERATE);
        } catch (error: any) {
            vscode.window.showErrorMessage(error?.message || AI_CONSTANTS.ERROR.GENERATE);
        }
    }
}
