import * as vscode from 'vscode';
import { IAIService } from './ai-service.interface';
import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { CONFIG_CONSTANTS } from '../constants';

/**
 * Resolves the active AI service based on the configured provider.
 */
export class AIServiceFactory {
    private static instance: IAIService | null = null;

    static getAIService(): IAIService {
        if (this.instance) {
            return this.instance;
        }

        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const provider = config.get<string>(CONFIG_CONSTANTS.PROVIDER) || CONFIG_CONSTANTS.DEFAULTS.PROVIDER;

        switch (provider) {
            case CONFIG_CONSTANTS.PROVIDERS.OPENAI:
                this.instance = OpenAIService.getInstance();
                break;
            case CONFIG_CONSTANTS.PROVIDERS.ANTHROPIC:
                this.instance = AnthropicService.getInstance();
                break;
            default:
                throw new Error(vscode.l10n.t("Unsupported AI provider: {0}", provider));
        }

        return this.instance;
    }

    static resetInstance(): void {
        this.instance?.resetInstance();
        this.instance = null;
    }
}
