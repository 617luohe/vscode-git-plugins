import * as vscode from 'vscode';

/**
 * A VS Code SCM resource state carries the file URI in `resourceUri`.
 */
interface ScmResourceLike {
    resourceUri?: vscode.Uri;
}

/**
 * Normalize the variadic SCM context-menu arguments into a de-duplicated list
 * of file URIs.
 *
 * VS Code passes the clicked resource first, then (on multi-select) the full
 * selection as an array in a later argument. This handles: single resource
 * state, array of resource states, raw Uri, and any mixture — de-duplicated by
 * fsPath, preserving first-seen order.
 */
export function normalizeToUris(args: unknown[]): vscode.Uri[] {
    const collected: vscode.Uri[] = [];

    const pushFrom = (item: unknown): void => {
        if (!item) {
            return;
        }
        if (item instanceof vscode.Uri) {
            collected.push(item);
            return;
        }
        const res = item as ScmResourceLike;
        if (res.resourceUri instanceof vscode.Uri) {
            collected.push(res.resourceUri);
        }
    };

    for (const arg of args) {
        if (Array.isArray(arg)) {
            arg.forEach(pushFrom);
        } else {
            pushFrom(arg);
        }
    }

    // De-duplicate by fsPath, preserving order
    const seen = new Set<string>();
    const unique: vscode.Uri[] = [];
    for (const uri of collected) {
        if (!seen.has(uri.fsPath)) {
            seen.add(uri.fsPath);
            unique.push(uri);
        }
    }
    return unique;
}
