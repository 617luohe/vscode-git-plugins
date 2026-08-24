import * as vscode from 'vscode';

/**
 * Global output channel for extension debug logs.
 * Call Logger.init() once in activate(), then use anywhere.
 */
export class Logger {
    private static channel: vscode.OutputChannel | null = null;

    /** Called once in activate() */
    static init(channelName: string): void {
        if (!this.channel) {
            this.channel = vscode.window.createOutputChannel(channelName);
        }
    }

    /** Normal info log */
    static log(message: string, ...args: any[]): void {
        this.write('INFO', message, ...args);
    }

    /** Warning log */
    static warn(message: string, ...args: any[]): void {
        this.write('WARN', message, ...args);
    }

    /** Error log */
    static error(message: string, error?: any): void {
        this.write('ERROR', message);
        if (error) {
            if (error instanceof Error) {
                this.write('ERROR', `  ${error.message}`);
                if (error.stack) {
                    this.write('ERROR', error.stack);
                }
            } else {
                this.write('ERROR', `  ${String(error)}`);
            }
        }
    }

    /** Show channel in output panel (without stealing focus) */
    static show(): void {
        this.channel?.show(true);
    }

    /** Release resources, called in deactivate() */
    static dispose(): void {
        this.channel?.dispose();
        this.channel = null;
    }

    private static write(level: string, message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const extra = args.length ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : '';
        const line = `[${timestamp}] [${level}] ${message}${extra}`;
        this.channel?.appendLine(line);
        console.log(line);
    }
}
