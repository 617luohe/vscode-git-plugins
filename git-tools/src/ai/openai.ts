import { OpenAI, ClientOptions, APIConnectionError } from 'openai';
import * as vscode from 'vscode';
import { CONFIG_CONSTANTS } from '../constants';
import { IAIService } from './ai-service.interface';
import { AIModel } from '../types/model';
import { ChatCompletionChunk, ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';
import { Stream } from 'openai/streaming';
import { buildCommitPrompt } from '../prompt/builtin-prompt';
import { Logger } from '../utils/logger';

export class OpenAIService implements IAIService {
    private static instance: OpenAIService | null = null;
    private openaiClient: OpenAI | null = null;

    private constructor() { }

    resetInstance(): void {
        OpenAIService.instance = null;
    }

    public static getInstance(): OpenAIService {
        if (OpenAIService.instance === null) {
            OpenAIService.instance = new OpenAIService();
        }
        return OpenAIService.instance;
    }

    private getOpenAIClient(): OpenAI {
        if (this.openaiClient === null) {
            const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
            const baseUrl = config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL;
            const apiKey = config.get<string>(CONFIG_CONSTANTS.OPENAI.API_KEY);

            if (!apiKey) {
                throw new Error(vscode.l10n.t("Please configure OpenAI API key in settings"));
            }

            const userAgent = config.get<string>(CONFIG_CONSTANTS.USER_AGENT) || '';
            const clientConfig: ClientOptions = {
                apiKey: apiKey,
                baseURL: baseUrl,
            };
            if (userAgent) {
                clientConfig.defaultHeaders = { 'User-Agent': userAgent };
            }
            this.openaiClient = new OpenAI(clientConfig);
        }
        return this.openaiClient;
    }

    public async getAvailableModels(): Promise<AIModel[]> {
        try {
            const openai = this.getOpenAIClient();
            const response = await openai.models.list();
            return response.data.map((model: { id: string; owned_by?: string; created: number }) => ({
                id: model.id,
                owner_by: model.owned_by || 'unknown',
                created: model.created
            }));
        } catch (error: any) {
            Logger.error(vscode.l10n.t("Failed to get OpenAI model list"), error);
            throw new Error(`Failed to get OpenAI model list: ${error.message}`);
        }
    }

    async *generateCommitMessage(diff: string, language: string): AsyncGenerator<string> {
        const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.ROOT);
        const model = config.get<string>(CONFIG_CONSTANTS.OPENAI.MODEL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.MODEL;
        const temperature = config.get<number>(CONFIG_CONSTANTS.OPENAI.TEMPERATURE) ?? CONFIG_CONSTANTS.DEFAULTS.OPENAI.TEMPERATURE;
        const topP = config.get<number>(CONFIG_CONSTANTS.OPENAI.TOP_P) ?? CONFIG_CONSTANTS.DEFAULTS.OPENAI.TOP_P;
        const maxTokens = config.get<number>(CONFIG_CONSTANTS.OPENAI.MAX_TOKENS) ?? CONFIG_CONSTANTS.DEFAULTS.OPENAI.MAX_TOKENS;

        const prompt = buildCommitPrompt(diff, language);
        const openai = this.getOpenAIClient();

        const createBody: ChatCompletionCreateParamsStreaming = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: temperature,
            top_p: topP,
            max_tokens: maxTokens,
            stream: true,
        };

        try {
            const stream = await openai.chat.completions.create(createBody) as Stream<ChatCompletionChunk>;
            for await (const chunk of stream) {
                if (!chunk.choices || chunk.choices.length === 0) {
                    continue;
                }
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    yield content;
                }
            }
        } catch (error: any) {
            Logger.error(vscode.l10n.t("OpenAI API call failed"), error);
            if (error instanceof APIConnectionError) {
                const baseUrl = config.get<string>(CONFIG_CONSTANTS.OPENAI.BASE_URL) || CONFIG_CONSTANTS.DEFAULTS.OPENAI.BASE_URL;
                throw new Error(vscode.l10n.t("Cannot connect to API endpoint: {0}. Please check your network or baseURL setting.", baseUrl));
            }
            throw new Error(`OpenAI API call failed: ${error.message}`);
        }
    }
}
