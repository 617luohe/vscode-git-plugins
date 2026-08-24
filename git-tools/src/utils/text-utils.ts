/**
 * Text processing utilities
 */
export class TextUtils {
    /**
     * Remove leading/trailing code block markers (```) from text.
     * @param text text to process
     * @returns processed text
     */
    public static removeCodeBlockMarkers(text: string): string {
        if (!text) {
            return '';
        }

        let result = text.trim();

        const lines = result.split('\n');
        if (lines.length > 0) {
            if (lines[0].trim().startsWith('```')) {
                lines.shift();
            }
            if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
                lines.pop();
            }
            result = lines.join('\n').trim();
        }

        return result;
    }

    /**
     * Replace embedded base64 image data in git diff with a placeholder,
     * avoiding token overflow from large image data.
     *
     * @param diff raw git diff text
     * @returns replaced diff text and replacement count
     */
    public static stripBase64Images(diff: string): { result: string; count: number } {
        if (!diff) {
            return { result: diff, count: 0 };
        }

        let count = 0;
        const placeholder = '[base64 image data placeholder]';

        // 1. data URI inline images (HTML src/href, Markdown ![](), CSS url(), string assignment)
        let result = diff.replace(
            /(data:image\/[a-zA-Z0-9+\-.]+;base64,)[A-Za-z0-9+/=\r\n]{20,}/g,
            (_match, prefix) => {
                count++;
                return `${prefix}${placeholder}`;
            }
        );

        // 2. Jupyter Notebook / JSON image fields, e.g. "image/png": "iVBOR..."
        result = result.replace(
            /("(?:image\/[a-zA-Z0-9+\-.]+|data)":\s*")[A-Za-z0-9+/=\r\n]{64,}(")/g,
            (_match, prefix, suffix) => {
                count++;
                return `${prefix}${placeholder}${suffix}`;
            }
        );

        // 3. Naked base64 lines (inline SVG, custom serialization)
        result = result.replace(
            /^([ +\-\\][ +\-]?)([A-Za-z0-9+/]{64,}={0,2})$/gm,
            (_match, linePrefix) => {
                count++;
                return `${linePrefix}${placeholder}`;
            }
        );

        return { result, count };
    }
}
