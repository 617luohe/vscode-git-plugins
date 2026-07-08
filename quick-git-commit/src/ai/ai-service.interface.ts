import { AIModel } from '../types/model';

/**
 * Common interface for AI providers.
 * Only commit-message generation is needed for this extension.
 */
export interface IAIService {
    /**
     * Generate a commit message from a git diff, streamed chunk by chunk.
     */
    generateCommitMessage(diff: string, language: string): AsyncGenerator<string>;

    /**
     * List available models. Optional - not all providers support it.
     */
    getAvailableModels?(): Promise<AIModel[]>;

    /**
     * Drop cached client so the next call re-reads config.
     */
    resetInstance(): void;
}
