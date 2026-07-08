import * as vscode from 'vscode';

/**
 * Config constants
 */
export const CONFIG_CONSTANTS = {
    // Config Root
    ROOT: 'quick-git-commit',

    // Provider
    PROVIDER: 'provider',
    LANGUAGE: 'language',
    USER_AGENT: 'userAgent',
    AUTO_STAGE: 'autoStageSelectedFiles',

    // OpenAI Config
    OPENAI: {
        BASE_URL: 'openai.baseUrl',
        API_KEY: 'openai.apiKey',
        MODEL: 'openai.model',
        TEMPERATURE: 'openai.temperature',
        TOP_P: 'openai.topP',
        MAX_TOKENS: 'openai.maxTokens'
    },

    // Anthropic Config
    ANTHROPIC: {
        BASE_URL: 'anthropic.baseUrl',
        API_KEY: 'anthropic.apiKey',
        MODEL: 'anthropic.model',
        TEMPERATURE: 'anthropic.temperature',
        TOP_P: 'anthropic.topP',
        MAX_TOKENS: 'anthropic.maxTokens'
    },

    // Git Config
    GIT: {
        UNTRACKED_FILE_MAX_BYTES: 'git.untrackedFileMaxBytes'
    },

    // Providers
    PROVIDERS: {
        OPENAI: 'OpenAI',
        ANTHROPIC: 'Anthropic'
    },

    // Default Values
    DEFAULTS: {
        PROVIDER: 'OpenAI',
        LANGUAGE: '简体中文',
        AUTO_STAGE: true,
        OPENAI: {
            BASE_URL: 'https://api.deepseek.com/v1',
            MODEL: 'deepseek-chat',
            TEMPERATURE: 0.3,
            TOP_P: 1,
            MAX_TOKENS: 500
        },
        ANTHROPIC: {
            BASE_URL: 'https://api.deepseek.com/v1',
            MODEL: 'deepseek-chat',
            TEMPERATURE: 0.3,
            TOP_P: 1,
            MAX_TOKENS: 500
        },
        GIT: {
            UNTRACKED_FILE_MAX_BYTES: 51200
        }
    }
};

/**
 * Command identifiers
 */
export const COMMANDS = {
    GENERATE_FROM_SELECTION: 'quick-git-commit.generateFromSelection',
    SWITCH_AI_MODEL: 'quick-git-commit.switchAIModel'
};

/**
 * Git-related user-facing text
 */
export const GIT_CONSTANTS = {
    ERROR: {
        get NO_REPOSITORY() { return vscode.l10n.t('No Git repository found'); },
        get NO_CHANGES() { return vscode.l10n.t('No code changes detected in the selected files'); },
        get NO_SELECTION() { return vscode.l10n.t('No files selected. Right-click one or more files in the Source Control panel'); }
    },
    get NEED_SELECTION() { return vscode.l10n.t('You need to select a Git repository to continue'); }
};

/**
 * AI service user-facing text
 */
export const AI_CONSTANTS = {
    PROGRESS: {
        get TITLE() { return vscode.l10n.t('Generating Commit message...'); },
        get LOADING_MODELS() { return vscode.l10n.t('Loading available models...'); }
    },
    SUCCESS: {
        get GENERATE() { return vscode.l10n.t('Successfully generated Commit message'); },
        get SWITCH_MODEL() { return vscode.l10n.t('Successfully switched AI model'); }
    },
    ERROR: {
        get GENERATE() { return vscode.l10n.t('Failed to generate Commit message'); },
        get LOAD_MODELS() { return vscode.l10n.t('Failed to load available models'); },
        get UNSUPPORTED_PROVIDER() { return vscode.l10n.t('Current AI provider does not support reading available models'); },
        get NO_BASE_URL() { return vscode.l10n.t('OpenAI Base URL is not set. Please configure it first'); },
        get NO_AVAILABLE_MODELS() { return vscode.l10n.t('No available AI models found'); }
    },
    UI: {
        get MODEL_SELECTION_PLACEHOLDER() { return vscode.l10n.t('Select an AI model to use'); },
        get MODEL_SELECTION_TITLE() { return vscode.l10n.t('AI Model Selection'); }
    }
};
