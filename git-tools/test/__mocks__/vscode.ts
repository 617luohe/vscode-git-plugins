/**
 * Minimal vscode mock for unit tests.
 * Only the surface actually used by the code under test is implemented.
 */

export class Uri {
    private constructor(public readonly fsPath: string) { }

    static file(p: string): Uri {
        return new Uri(p);
    }
}

export const l10n = {
    // Simple passthrough with {0}, {1}... substitution
    t(message: string, ...args: unknown[]): string {
        return message.replace(/\{(\d+)\}/g, (_m, i) => String(args[Number(i)] ?? ''));
    }
};

export const window = {
    showErrorMessage: (..._args: unknown[]) => undefined,
    showInformationMessage: (..._args: unknown[]) => undefined,
    showWarningMessage: (..._args: unknown[]) => undefined,
    showQuickPick: (..._args: unknown[]) => undefined,
    createOutputChannel: (_name: string) => ({
        appendLine: (_line: string) => undefined,
        show: (_preserveFocus?: boolean) => undefined,
        dispose: () => undefined
    }),
    withProgress: async (_opts: unknown, task: (...a: unknown[]) => Promise<unknown>) => task()
};

export const workspace = {
    getConfiguration: (_section?: string) => ({
        get: (_key: string) => undefined,
        update: async (..._args: unknown[]) => undefined
    }),
    onDidChangeConfiguration: (_listener: unknown) => ({ dispose: () => undefined })
};

export const extensions = {
    getExtension: (_id: string) => undefined
};

export const commands = {
    registerCommand: (_id: string, _cb: unknown) => ({ dispose: () => undefined }),
    executeCommand: async (..._args: unknown[]) => undefined
};

export enum ProgressLocation {
    SourceControl = 1,
    Window = 10,
    Notification = 15
}

export enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3
}

export class EventEmitter<T> {
    private listeners: Array<(e: T) => void> = [];
    event = (listener: (e: T) => void) => {
        this.listeners.push(listener);
        return { dispose: () => undefined };
    };
    fire(data: T): void {
        this.listeners.forEach(l => l(data));
    }
    dispose(): void {
        this.listeners = [];
    }
}
