# OpenCode Sidebar

Click the Activity Bar icon to open the official OpenCode extension in a new tab.

The extension delegates to `sst-dev.opencode` by invoking its `opencode.openNewTerminal` command. It does not embed or reimplement OpenCode. The Activity Bar view is temporary: after the command is handled, the sidebar closes so the icon is ready for the next click.

If the official OpenCode extension is not installed, the launcher shows an install action that opens `vscode:extension/sst-dev.opencode` in VS Code.

## Development

This extension supports VS Code `^1.75.0` and Node.js `>=20.0.0`.

```bash
npm ci
npm run typecheck
npm test
npm run compile
npm run vscode:package
```

The icon assets are `assets/icon.png` and `assets/opencode-activity.svg`.
