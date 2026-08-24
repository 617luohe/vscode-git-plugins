/**
 * Built-in commit message prompt.
 * Placeholders: {diff} for the code changes, {language} for the output language.
 */
export const BUILTIN_COMMIT_PROMPT = `You are an expert software engineer writing a git commit message.

Analyze the following code changes and write a single, well-formed commit message that follows the Conventional Commits specification.

Rules:
- Format: <type>(<optional scope>): <subject>
- Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- The subject line must be concise (<= 72 characters), imperative mood, no trailing period.
- If the change is non-trivial, add a body after a blank line explaining WHAT changed and WHY. Use bullet points ("- ") for multiple distinct changes.
- Do NOT wrap the output in code fences or markdown.
- Write the message in {language}.

Code changes:
{diff}`;

/**
 * Build the final prompt by substituting placeholders.
 */
export function buildCommitPrompt(diff: string, language: string): string {
    return BUILTIN_COMMIT_PROMPT
        .replaceAll('{language}', language)
        .replace('{diff}', diff);
}
