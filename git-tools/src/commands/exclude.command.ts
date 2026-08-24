import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';

let channel: vscode.OutputChannel | undefined;

function log(line: string): void {
    if (!channel) channel = vscode.window.createOutputChannel('Git Tools');
    channel.appendLine(line);
}

/**
 * 从版本管理中排除所选文件/目录（git rm --cached），并可选写入 .gitignore。
 * 原 quick-git-exclude 功能。
 */
export class ExcludeCommand {
    public async execute(clickedUri: vscode.Uri | undefined, selectedUris: vscode.Uri[] | undefined): Promise<void> {
        await excludeFromVersionControl(clickedUri, selectedUris);
    }
}

async function excludeFromVersionControl(
    clickedUri: vscode.Uri | undefined,
    selectedUris: vscode.Uri[] | undefined
): Promise<void> {
    // 1. Collect URIs
    let uris: vscode.Uri[] = [];
    if (selectedUris && selectedUris.length > 0) {
        uris = selectedUris;
    } else if (clickedUri) {
        uris = [clickedUri];
    } else {
        vscode.window.showWarningMessage('请先选择一个或多个文件或文件夹。');
        return;
    }

    // 2. Workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('没有找到工作区目录。');
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const git: SimpleGit = simpleGit(workspaceRoot, { binary: 'git' });

    // 3. Verify git repo
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

    // 4. Collect all tracked + untracked files under selected paths
    const allTrackedFiles: string[] = [];
    const allUntrackedFiles: string[] = [];

    for (const u of uris) {
        const relativePath = path.relative(workspaceRoot, u.fsPath).replace(/\\/g, '/');
        if (!relativePath) {
            log('  ⚠ 不能选择仓库根目录。');
            continue;
        }

        let isDirectory = false;
        try {
            isDirectory = fs.statSync(u.fsPath).isDirectory();
        } catch {
            isDirectory = false;
        }

        if (isDirectory) {
            const dirPath = relativePath.endsWith('/') ? relativePath : relativePath + '/';
            try {
                const output = await git.raw(['ls-files', '-z', dirPath]);
                if (output) {
                    const files = output.split('\0').filter(Boolean);
                    allTrackedFiles.push(...files);
                    log(`  找到 ${files.length} 个跟踪文件在: ${relativePath}/`);
                }
            } catch { /* ignore */ }

            try {
                const output = await git.raw(['ls-files', '--others', '--exclude-standard', '-z', dirPath]);
                if (output) {
                    const files = output.split('\0').filter(Boolean);
                    allUntrackedFiles.push(...files);
                    if (files.length > 0) {
                        log(`  找到 ${files.length} 个未跟踪文件在: ${relativePath}/`);
                    }
                }
            } catch { /* ignore */ }
        } else {
            try {
                const output = await git.raw(['ls-files', relativePath]);
                if (output && output.trim()) {
                    allTrackedFiles.push(relativePath);
                } else {
                    allUntrackedFiles.push(relativePath);
                }
            } catch {
                allUntrackedFiles.push(relativePath);
            }
        }
    }

    if (allTrackedFiles.length === 0 && allUntrackedFiles.length === 0) {
        vscode.window.showInformationMessage('所选路径下没有找到任何 Git 文件。');
        return;
    }

    // 5. Remove tracked files from index
    let removedCount = 0;
    let failCount = 0;
    let addedToGitignore = false;

    if (allTrackedFiles.length > 0) {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `正在从版本管理中移除 ${allTrackedFiles.length} 个文件...`,
                cancellable: false,
            },
            async () => {
                const batchSize = 50;
                for (let i = 0; i < allTrackedFiles.length; i += batchSize) {
                    const batch = allTrackedFiles.slice(i, i + batchSize);
                    try {
                        await git.raw(['rm', '--cached', '--force', ...batch]);
                        removedCount += batch.length;
                        for (const file of batch) log(`✓ 已排除: ${file}`);
                    } catch {
                        for (const file of batch) {
                            try {
                                await git.raw(['rm', '--cached', '--force', file]);
                                removedCount++;
                                log(`✓ 已排除: ${file}`);
                            } catch (err2: any) {
                                failCount++;
                                log(`✗ 失败: ${file} — ${err2?.message || String(err2)}`);
                            }
                        }
                    }
                }
            }
        );
    }

    // 6. Ask about .gitignore
    const gitignorePaths = new Set<string>();
    for (const u of uris) {
        const relativePath = path.relative(workspaceRoot, u.fsPath).replace(/\\/g, '/');
        if (!relativePath) continue;

        let isDirectory = false;
        try {
            isDirectory = fs.statSync(u.fsPath).isDirectory();
        } catch {
            isDirectory = false;
        }

        if (isDirectory) {
            gitignorePaths.add(relativePath.endsWith('/') ? relativePath : relativePath + '/');
        } else {
            gitignorePaths.add(relativePath);
        }
    }

    if (gitignorePaths.size > 0) {
        const trackedOrUntracked = allTrackedFiles.length > 0 ? '已从 Git 跟踪中移除' : '检测到未跟踪文件';
        const answer = await vscode.window.showInformationMessage(
            `${trackedOrUntracked}。是否将这些路径添加到 .gitignore 以永久忽略？`,
            '添加到 .gitignore',
            '跳过'
        );

        if (answer === '添加到 .gitignore') {
            try {
                const gitignorePath = path.join(workspaceRoot, '.gitignore');
                let gitignoreContent = '';
                try {
                    gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
                } catch {
                    // .gitignore doesn't exist yet
                }

                const lines = gitignoreContent.split('\n').map(l => l.trim());
                const newEntries: string[] = [];

                for (const gp of Array.from(gitignorePaths)) {
                    const alreadyPresent = lines.some(l => l === gp || l === '/' + gp);
                    if (!alreadyPresent) {
                        newEntries.push('/' + gp);
                    }
                }

                if (newEntries.length > 0) {
                    const addition = '\n' + newEntries.join('\n') + '\n';
                    fs.appendFileSync(gitignorePath, addition, 'utf-8');
                    addedToGitignore = true;
                    for (const entry of newEntries) log(`✓ 已添加到 .gitignore: ${entry}`);
                } else {
                    log('.gitignore 中已包含这些路径，无需重复添加。');
                }
            } catch (error: any) {
                log(`✗ 写入 .gitignore 失败: ${error?.message || String(error)}`);
            }
        }
    }

    // 7. Report results
    const parts: string[] = [];
    if (removedCount > 0) parts.push(`已从跟踪中移除 ${removedCount} 个文件`);
    if (failCount > 0) parts.push(`${failCount} 个文件移除失败`);
    if (addedToGitignore) parts.push('已添加到 .gitignore');
    if (parts.length > 0) {
        vscode.window.showInformationMessage(parts.join('，'));
    }

    // 8. Refresh SCM
    try {
        vscode.commands.executeCommand('git.refresh');
    } catch { /* ignore */ }
}
