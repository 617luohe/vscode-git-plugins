import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { GitExtension, Repository, API } from './types/git';
import { GIT_CONSTANTS } from './constants';
import { Logger } from './utils/logger';
import { TextUtils } from './utils/text-utils';

/**
 * Git operations for the "generate from selected files" flow.
 */
export class GitService {
    /**
     * Resolve the VS Code Git API, waiting for initialization if needed.
     */
    private static async getGitAPI(): Promise<API | null> {
        const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
        if (!gitExtension) {
            Logger.warn('[GitService] vscode.git extension not found or not exported');
            return null;
        }

        const api = gitExtension.getAPI(1);

        // Wait for the API to be ready (max 5 secs) if still uninitialized
        if (api.state === 'uninitialized') {
            Logger.log('[GitService] git API is uninitialized, waiting for it to be ready...');
            await new Promise<void>((resolve) => {
                const disposable = api.onDidChangeState((state) => {
                    if (state !== 'uninitialized') {
                        disposable.dispose();
                        resolve();
                    }
                });
                setTimeout(() => { disposable.dispose(); resolve(); }, 5000);
            });
        }

        return api;
    }

    /**
     * Resolve the repository that owns a given file URI.
     * Falls back to the single/only repository when the file cannot be matched.
     */
    static async getRepositoryForUri(uri: vscode.Uri | undefined): Promise<Repository | null> {
        const api = await this.getGitAPI();
        if (!api) {
            return null;
        }

        if (uri) {
            const repo = api.getRepository(uri);
            if (repo) {
                Logger.log(`[GitService] Resolved repo from uri: ${repo.rootUri?.fsPath}`);
                return repo;
            }
            Logger.warn(`[GitService] Could not resolve repo for uri: ${uri.fsPath}`);
        }

        const repositories = api.repositories;
        if (repositories.length === 0) {
            Logger.warn('[GitService] No repositories found in workspace');
            return null;
        }
        if (repositories.length === 1) {
            return repositories[0];
        }

        // Multiple repos and no matching uri: ask the user to pick
        const items = repositories.map(repo => ({ label: repo.rootUri.fsPath, repo }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: GIT_CONSTANTS.NEED_SELECTION
        });
        return selected ? selected.repo : null;
    }

    /**
     * Determine which of the given absolute paths are untracked in the repo.
     * @returns a Set of absolute fsPaths that are untracked
     */
    private static getUntrackedPaths(repository: Repository, fsPaths: string[]): Set<string> {
        const untracked = new Set(
            repository.state.untrackedChanges.map(c => path.normalize(c.uri.fsPath))
        );
        const result = new Set<string>();
        for (const p of fsPaths) {
            if (untracked.has(path.normalize(p))) {
                result.add(p);
            }
        }
        return result;
    }

    /**
     * Build a combined diff for the selected files.
     *
     * - Tracked files: `git diff HEAD -- <paths>` (all changes vs last commit).
     * - Untracked files: read full content and append as an "added file" block,
     *   since `git diff HEAD` produces no output for files git does not know.
     *
     * @param repository the owning repository
     * @param fsPaths absolute file paths that were selected
     * @param untrackedMaxBytes skip inlining untracked files larger than this (0 = no limit)
     * @returns the combined diff text, or undefined when there is nothing to describe
     */
    static async getDiffForFiles(
        repository: Repository,
        fsPaths: string[],
        untrackedMaxBytes: number
    ): Promise<string | undefined> {
        if (!repository.rootUri || fsPaths.length === 0) {
            return undefined;
        }

        const repoPath = repository.rootUri.fsPath;
        const git: SimpleGit = simpleGit(repoPath);

        const untracked = this.getUntrackedPaths(repository, fsPaths);
        const trackedPaths = fsPaths.filter(p => !untracked.has(p));

        const sections: string[] = [];

        // 1. Tracked files: real git diff against HEAD
        if (trackedPaths.length > 0) {
            try {
                // Use `git diff HEAD -- <paths>`; simple-git passes each arg safely (no shell interpolation)
                const relPaths = trackedPaths.map(p => path.relative(repoPath, p));
                let diff = await git.diff(['HEAD', '--no-color', '--', ...relPaths]);

                const { result: strippedDiff, count } = TextUtils.stripBase64Images(diff);
                if (count > 0) {
                    Logger.log(`[GitService] Stripped ${count} base64 image(s) from diff`);
                    diff = strippedDiff;
                }
                if (diff.trim()) {
                    sections.push(diff.trim());
                }
            } catch (error) {
                Logger.error('[GitService] git diff failed', error);
            }
        }

        // 2. Untracked files: inline full content as an added-file block
        for (const abs of untracked) {
            const rel = path.relative(repoPath, abs);
            try {
                const stat = await fs.stat(abs);
                if (untrackedMaxBytes > 0 && stat.size > untrackedMaxBytes) {
                    sections.push(`diff --git a/${rel} b/${rel}\nnew file (untracked, ${stat.size} bytes) — content omitted (exceeds size limit)`);
                    continue;
                }
                const raw = await fs.readFile(abs, 'utf-8');
                const { result: content } = TextUtils.stripBase64Images(raw);
                const body = content
                    .split('\n')
                    .map(line => `+${line}`)
                    .join('\n');
                sections.push(`diff --git a/${rel} b/${rel}\nnew file: ${rel}\n${body}`);
            } catch (error) {
                Logger.error(`[GitService] Failed to read untracked file ${rel}`, error);
            }
        }

        const combined = sections.join('\n\n');
        return combined.trim() ? combined : undefined;
    }

    /**
     * Stage the given files (git add), so a subsequent commit includes only them.
     */
    static async stageFiles(repository: Repository, fsPaths: string[]): Promise<void> {
        if (fsPaths.length === 0) {
            return;
        }
        try {
            await repository.add(fsPaths);
            Logger.log(`[GitService] Staged ${fsPaths.length} file(s)`);
        } catch (error) {
            Logger.error('[GitService] Failed to stage files', error);
            throw error;
        }
    }
}
