import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit from 'simple-git';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    outputChannel = vscode.window.createOutputChannel('Quick Git Exclude');
    outputChannel.appendLine('Quick Git Exclude is activated.');

    const disposable = vscode.commands.registerCommand(
        'quick-git-exclude.excludeFromVC',
        async (uri: vscode.Uri | undefined, selectedUris: vscode.Uri[] | undefined) => {
            await excludeFromVersionControl(uri, selectedUris);
        }
    );

    context.subscriptions.push(disposable);
    context.subscriptions.push(outputChannel);
}

async function excludeFromVersionControl(
    clickedUri: vscode.Uri | undefined,
    selectedUris: vscode.Uri[] | undefined
) {
    // 1. Collect all URIs to process
    let uris: vscode.Uri[] = [];

    if (selectedUris && selectedUris.length > 0) {
        // Multi-selection in Explorer
        uris = selectedUris;
    } else if (clickedUri) {
        // Single selection in Explorer or SCM view
        uris = [clickedUri];
    } else {
        vscode.window.showWarningMessage('No file selected. Please select one or more files first.');
        return;
    }

    // 2. Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const git = simpleGit(workspaceRoot, { binary: 'git' });

    // 3. Verify it's a git repository
    try {
        const isRepo = await git.checkIsRepo();
        if (!isRepo) {
            vscode.window.showErrorMessage('当前目录不是一个 Git 仓库。');
            return;
        }
    } catch {
        vscode.window.showErrorMessage('无法检测 Git 仓库状态。');
        return;
    }

    // 4. Process each URI
    const results: { path: string; success: boolean; message: string }[] = [];

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: '正在从版本管理中移除文件...',
            cancellable: false,
        },
        async () => {
            for (const u of uris) {
                const relativePath = path
                    .relative(workspaceRoot, u.fsPath)
                    .replace(/\\/g, '/');

                try {
                    // Determine if it's a directory
                    let isDirectory = false;
                    try {
                        isDirectory = fs.statSync(u.fsPath).isDirectory();
                    } catch {
                        // File might not exist on disk (e.g. deleted but still tracked)
                        isDirectory = false;
                    }

                    const args: string[] = ['rm', '--cached'];
                    if (isDirectory) {
                        args.push('-r');
                    }
                    args.push('--force', relativePath);

                    await git.raw(args);
                    results.push({ path: relativePath, success: true, message: '' });
                    outputChannel.appendLine(`✓ Excluded: ${relativePath}`);
                } catch (error: any) {
                    const errorMsg = error?.message || String(error);
                    results.push({ path: relativePath, success: false, message: errorMsg });
                    outputChannel.appendLine(`✗ Failed: ${relativePath} — ${errorMsg}`);
                }
            }
        }
    );

    // 5. Report results
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
        const msg =
            successCount === 1
                ? `已成功将 1 个文件从版本管理中移除。`
                : `已成功将 ${successCount} 个文件从版本管理中移除。`;
        vscode.window.showInformationMessage(msg);
    }

    if (failCount > 0) {
        const msg = `${failCount} 个文件移除失败。请查看输出信息了解详情。`;
        vscode.window.showWarningMessage(msg, '查看输出').then((selection) => {
            if (selection === '查看输出') {
                outputChannel.show();
            }
        });
    }

    // 6. Refresh SCM view to reflect changes
    try {
        vscode.commands.executeCommand('git.refresh');
    } catch {
        // git.refresh may not be available in all versions
    }
}

export function deactivate() {
    // Cleanup handled by context.subscriptions
}
