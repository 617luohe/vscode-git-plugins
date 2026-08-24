import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import { ConfigService } from '../config';
import { GenerateFromSelectionCommand } from './generate-from-selection.command';
import { SwitchModelCommand } from './switch-model.command';
import { ExcludeCommand } from './exclude.command';

/**
 * Registers all extension commands and adds them to the context subscriptions.
 */
export class CommandRegistry {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configService: ConfigService
    ) { }

    public registerCommands(): void {
        const generateCommand = new GenerateFromSelectionCommand(this.configService);
        const generateDisposable = vscode.commands.registerCommand(
            COMMANDS.GENERATE_FROM_SELECTION,
            (...args: unknown[]) => generateCommand.execute(...args)
        );

        const switchModelCommand = new SwitchModelCommand(this.configService);
        const switchModelDisposable = vscode.commands.registerCommand(
            COMMANDS.SWITCH_AI_MODEL,
            () => switchModelCommand.execute()
        );

        const excludeCommand = new ExcludeCommand();
        const excludeDisposable = vscode.commands.registerCommand(
            COMMANDS.EXCLUDE_FROM_VC,
            (clickedUri: vscode.Uri | undefined, selectedUris: vscode.Uri[] | undefined) =>
                excludeCommand.execute(clickedUri, selectedUris)
        );

        this.context.subscriptions.push(
            generateDisposable,
            switchModelDisposable,
            excludeDisposable
        );
    }
}
