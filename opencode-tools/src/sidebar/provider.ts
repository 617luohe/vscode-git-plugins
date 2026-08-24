import * as vscode from "vscode"

/**
 * 空树数据提供器：点击活动栏图标即可直接启动 OpenCode（由 LaunchController 处理），
 * 不再渲染任何“点击启动”子项。
 */
export class SidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  public getChildren(): vscode.TreeItem[] {
    return []
  }
}
