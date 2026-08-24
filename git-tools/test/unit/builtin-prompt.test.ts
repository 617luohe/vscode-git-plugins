import { describe, it, expect } from 'vitest';
import { buildCommitPrompt, BUILTIN_COMMIT_PROMPT } from '../../src/prompt/builtin-prompt';

describe('buildCommitPrompt', () => {
    it('substitutes the {diff} placeholder', () => {
        const result = buildCommitPrompt('my diff content', 'English');
        expect(result).toContain('my diff content');
        expect(result).not.toContain('{diff}');
    });

    it('substitutes every {language} placeholder', () => {
        const result = buildCommitPrompt('diff', '简体中文');
        expect(result).toContain('简体中文');
        expect(result).not.toContain('{language}');
    });

    it('keeps the diff at the end so it is the last thing the model reads', () => {
        const result = buildCommitPrompt('THE_DIFF', 'English');
        expect(result.trimEnd().endsWith('THE_DIFF')).toBe(true);
    });

    it('does not mutate the original template constant', () => {
        buildCommitPrompt('a', 'English');
        expect(BUILTIN_COMMIT_PROMPT).toContain('{diff}');
        expect(BUILTIN_COMMIT_PROMPT).toContain('{language}');
    });

    it('handles diff text that itself contains placeholder-like tokens', () => {
        // A diff containing "{language}" must not be re-substituted, because
        // {diff} is replaced after {language}.
        const result = buildCommitPrompt('text with {language} inside', 'English');
        expect(result).toContain('text with {language} inside');
    });
});
