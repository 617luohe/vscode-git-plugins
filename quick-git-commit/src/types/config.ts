/**
 * OpenAI configuration
 */
export interface OpenAIConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
}

/**
 * Anthropic configuration
 */
export interface AnthropicConfig {
    apiKey: string;
    model: string;
    baseUrl: string;
}

/**
 * Extension configuration
 */
export interface ExtensionConfig {
    provider: string;
    language: string;
    userAgent: string;
    autoStageSelectedFiles: boolean;
    openai: OpenAIConfig;
    anthropic: AnthropicConfig;
    git: {
        untrackedFileMaxBytes: number;
    };
}
