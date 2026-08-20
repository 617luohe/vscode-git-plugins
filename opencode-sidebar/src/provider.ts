import * as vscode from "vscode"

export class SidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  public getChildren(): vscode.TreeItem[] {
    return [new vscode.TreeItem(vscode.l10n.t("Click to launch OpenCode"))]
  }
}
