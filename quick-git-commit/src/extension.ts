import * as vscode from 'vscode';
import { ConfigService } from './config';
import { CommandRegistry } from './commands/command.registry';
import { Logger } from './utils/logger';

// Activate extension
export function activate(context: vscode.ExtensionContext) {
    const extensionName = context.extension.packageJSON.displayName;

    // Initialize output channel once for the plugin lifecycle
    Logger.init(extensionName);
    Logger.log(`${extensionName} is activated.`);

    // Initialize services
    const configService = ConfigService.getInstance();

    // Register commands
    const commandRegistry = new CommandRegistry(context, configService);
    commandRegistry.registerCommands();

    context.subscriptions.push(configService);

    Logger.log('All commands registered.');
}

// Deactivate extension
export function deactivate() {
    Logger.dispose();
}
