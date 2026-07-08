import * as vscode from 'vscode';
import { ExtensionConfig } from './types/config';
import { CONFIG_CONSTANTS } from './constants';
import { AIServiceFactory } from './ai/ai-service.factory';

/**
 * Configuration service - singleton
 * Reads extension settings and resets AI service when config changes.
 */
export class ConfigService {
    private static _instance: ConfigService | null = null;
    private _onDidChangeConfig: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    private _disposables: vscode.Disposable[] = [];
    public readonly onDidChangeConfig: vscode.Event<void> = this._onDidChangeConfig.event;

    private constructor() {
        // Reset AI service instance when any of our settings change
        this._disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(CONFIG_CONSTANTS.ROOT)) {
                    AIServiceFactory.resetInstance();
                    this._onDidChangeConfig.fire();
                }
            })
        );
    }

    public static getInstance(): ConfigService {
        if (!ConfigService._instance) {
            ConfigService._instance = new ConfigService();
        }
        return ConfigService._instance;
    }

    /**
     * Read the current extension configuration.
     */
    public getExtensionConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);

        return {
            provider: config.get<string>(CONFIG_CONSTANTS.PROVIDER) || CONFIG_CONSTANTS.DEFAULTS.PROVIDER,
            language: config.get<string>(CONFIG_CONSTANTS.LANGUAGE) || CONFIG_CONSTANTS.DEFAULTS.LANGUAGE,
            userAgent: config.get<string>(CONFIG_CONSTANTS.USER_AGENT) || '',
            autoStageSelectedFiles: config.get<boolean>(CONFIG_CONSTANTS.AUTO_STAGE) ?? CONFIG_CONSTANTS.DEFAULTS.AUTO_STAGE,
            openai: {
                apiKey: config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY) || '',
                model: config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL,
                baseUrl: config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL
            },
            anthropic: {
                apiKey: config.get<string>(CONFIG_CONSTANTS.ANTHROPIC.API_KEY) || '',
                model: config.get<string>(CONFIG_CONSTANTS.ANTHROPIC.MODEL) || CONFIG_CONSTANTS.DEFAULTS.ANTHROPIC.MODEL,
                baseUrl: config.get<string>(CONFIG_CONSTANTS.ANTHROPIC.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.ANTHROPIC.BASE_URL
            },
            git: {
                untrackedFileMaxBytes: config.get<number>(CONFIG_CONSTANTS.GIT.UNTRACKED_FILE_MAX_BYTES) ?? CONFIG_CONSTANTS.DEFAULTS.GIT.UNTRACKED_FILE_MAX_BYTES
            }
        };
    }

    /**
     * Verify the selected provider has the minimal config to run.
     * Prompts the user to open settings when incomplete.
     * @returns true when config is complete
     */
    public async checkAIConfig(config: ExtensionConfig, provider: string): Promise<boolean> {
        let incomplete = false;

        if (provider === CONFIG_CONSTANTS.PROVIDERS.OPENAI) {
            const { apiKey, model, baseUrl } = config.openai;
            incomplete = !baseUrl || !apiKey || !model;
        } else if (provider === CONFIG_CONSTANTS.PROVIDERS.ANTHROPIC) {
            const { apiKey, model, baseUrl } = config.anthropic;
            incomplete = !baseUrl || !apiKey || !model;
        }

        if (incomplete) {
            const configure = vscode.l10n.t("Configure");
            const result = await vscode.window.showWarningMessage(
                vscode.l10n.t("{0} configuration is incomplete. Configure now?", provider),
                { modal: true },
                configure
            );
            if (result === configure) {
                await vscode.commands.executeCommand('workbench.action.openSettings', CONFIG_CONSTANTS.ROOT);
            }
            return false;
        }

        return true;
    }

    dispose() {
        this._disposables.forEach(d => d.dispose());
        this._onDidChangeConfig.dispose();
    }
}
