export const l10n = {
  t: (message: string): string => message,
}

export class TreeItem {
  public constructor(public readonly label: string) {}
}

export const ViewColumn = { Active: -1, Beside: -2 }

type TerminalLike = { readonly show: () => void; readonly sendText: (text: string) => void }

export const commands = {
  registerCommand: (command: string, handler: unknown): { dispose: () => void } => {
    void command
    void handler
    return { dispose: () => undefined }
  },
}

export const window = {
  showInformationMessage: async (message: string, action?: string): Promise<string | undefined> => {
    void message
    return action
  },
  showErrorMessage: async (message: string): Promise<void> => {
    void message
  },
  createTerminal: (_options: unknown): TerminalLike => ({ show: () => undefined, sendText: () => undefined }),
}
