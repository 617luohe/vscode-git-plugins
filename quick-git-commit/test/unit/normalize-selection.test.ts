import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import { normalizeToUris } from '../../src/utils/normalize-selection';

/** Build a fake SCM resource state carrying a resourceUri. */
function resource(fsPath: string): { resourceUri: vscode.Uri } {
    return { resourceUri: vscode.Uri.file(fsPath) };
}

describe('normalizeToUris', () => {
    it('returns empty for no args (command palette / empty selection)', () => {
        expect(normalizeToUris([])).toEqual([]);
    });

    it('returns empty when args are all null/undefined', () => {
        expect(normalizeToUris([undefined, null])).toEqual([]);
    });

    it('handles a single clicked resource state', () => {
        const uris = normalizeToUris([resource('/repo/a.ts')]);
        expect(uris.map(u => u.fsPath)).toEqual(['/repo/a.ts']);
    });

    it('handles multi-select: clicked resource + array of resources', () => {
        // VS Code passes the clicked item first, then the full selection array.
        const clicked = resource('/repo/a.ts');
        const selection = [resource('/repo/a.ts'), resource('/repo/b.ts'), resource('/repo/c.ts')];
        const uris = normalizeToUris([clicked, selection]);
        expect(uris.map(u => u.fsPath)).toEqual(['/repo/a.ts', '/repo/b.ts', '/repo/c.ts']);
    });

    it('de-duplicates by fsPath preserving first-seen order', () => {
        const uris = normalizeToUris([
            resource('/repo/b.ts'),
            [resource('/repo/b.ts'), resource('/repo/a.ts'), resource('/repo/b.ts')]
        ]);
        expect(uris.map(u => u.fsPath)).toEqual(['/repo/b.ts', '/repo/a.ts']);
    });

    it('accepts raw Uri arguments', () => {
        const uris = normalizeToUris([vscode.Uri.file('/repo/x.ts')]);
        expect(uris.map(u => u.fsPath)).toEqual(['/repo/x.ts']);
    });

    it('ignores items without a resourceUri', () => {
        const uris = normalizeToUris([{ foo: 'bar' }, resource('/repo/a.ts')]);
        expect(uris.map(u => u.fsPath)).toEqual(['/repo/a.ts']);
    });
});
