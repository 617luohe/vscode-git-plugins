import { describe, it, expect } from 'vitest';
import { TextUtils } from '../../src/utils/text-utils';

describe('TextUtils.removeCodeBlockMarkers', () => {
    it('returns empty string for empty input', () => {
        expect(TextUtils.removeCodeBlockMarkers('')).toBe('');
    });

    it('strips leading and trailing code fences', () => {
        const input = '```\nfeat: add feature\n```';
        expect(TextUtils.removeCodeBlockMarkers(input)).toBe('feat: add feature');
    });

    it('strips a fenced block with a language tag', () => {
        const input = '```text\nfix: bug\n```';
        expect(TextUtils.removeCodeBlockMarkers(input)).toBe('fix: bug');
    });

    it('leaves plain text untouched', () => {
        const input = 'chore: tidy up';
        expect(TextUtils.removeCodeBlockMarkers(input)).toBe('chore: tidy up');
    });

    it('preserves inner content and only trims the outer fences', () => {
        const input = '```\nline1\nline2\n```';
        expect(TextUtils.removeCodeBlockMarkers(input)).toBe('line1\nline2');
    });
});

describe('TextUtils.stripBase64Images', () => {
    it('returns input unchanged when there are no images', () => {
        const { result, count } = TextUtils.stripBase64Images('const x = 1;');
        expect(result).toBe('const x = 1;');
        expect(count).toBe(0);
    });

    it('replaces a data URI base64 image payload', () => {
        const long = 'A'.repeat(40);
        const { result, count } = TextUtils.stripBase64Images(`src="data:image/png;base64,${long}"`);
        expect(count).toBe(1);
        expect(result).toContain('[base64 image data placeholder]');
        expect(result).not.toContain(long);
    });

    it('replaces a Jupyter-style image field', () => {
        const long = 'B'.repeat(80);
        const { result, count } = TextUtils.stripBase64Images(`"image/png": "${long}"`);
        expect(count).toBe(1);
        expect(result).toContain('[base64 image data placeholder]');
    });
});
