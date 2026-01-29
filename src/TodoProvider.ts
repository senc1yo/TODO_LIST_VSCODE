import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This class defines what goes into the list
export interface TodoEntry {
  label: string;
  description: string;
  tooltip: string;
  fileUri: vscode.Uri;
  lineNumber: number;
  priority: 'h' | 'm' | 'l' | 'none';
}

export class TodoProvider implements vscode.TreeDataProvider<TodoItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TodoItem | undefined | void> = new vscode.EventEmitter<TodoItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TodoItem | undefined | void> = this._onDidChangeTreeData.event;

  private readonly disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    const watcher = vscode.workspace.createFileSystemWatcher('src/**/*.{ts,js,py,java,c,cpp,cs,html,css}');
    this.disposables.push(
      watcher,
      watcher.onDidCreate(() => this.refresh()),
      watcher.onDidChange(() => this.refresh()),
      watcher.onDidDelete(() => this.refresh())
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.uri.fsPath.includes(`${path.sep}src${path.sep}`)) {
          this.refresh();
        }
      })
    );

    context.subscriptions.push(...this.disposables);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TodoItem): vscode.TreeItem {
    return element;
  }

  // gather the data
  async getChildren(element?: TodoItem): Promise<TodoItem[]> {
    if (element) {
      return []; // No nested children
    }

    const todosData = await this.getTodos();
    return todosData.map(todo => {
      const item = new TodoItem(
        todo.label,
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'todoPanel.openFile',
          title: "Open File",
          arguments: [todo.fileUri, todo.lineNumber]
        }
      );

      item.description = todo.description;
      item.tooltip = todo.tooltip;
      item.iconPath = this.getPriorityIcon(todo.priority);
      return item;
    });
  }

  async getTodos(): Promise<TodoEntry[]> {
    const todos: TodoEntry[] = [];

    // find all files
    const files = await vscode.workspace.findFiles('src/**/*.{ts,js,py,java,c,cpp,cs,html,css}', '**/node_modules/**');

    // loop through files and search for regex
    const todoRegex = /\/\/\s*TODO\b(?::\s*(.*))?/;

    for (const fileUri of files) {
      let text = '';
      try {
        text = await fs.promises.readFile(fileUri.fsPath, 'utf8');
      } catch {
        continue;
      }

      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(todoRegex);

        if (match) {
          const rawComment = match[1]?.trim() || 'TODO';
          const priority = this.getPriority(line);
          const comment = this.stripPriority(rawComment);
          const description = `${path.basename(fileUri.fsPath)} • Line ${i + 1}`;
          const tooltip = this.stripPriority(line.trim());

          todos.push({
            label: comment,
            description,
            tooltip,
            fileUri,
            lineNumber: i,
            priority
          });
        }
      }
    }

    return todos;
  }

  private getPriority(line: string): 'h' | 'm' | 'l' | 'none' {
    const lower = line.toLowerCase();
    if (/(^|\s)-h(\s|$)/.test(lower)) {
      return 'h';
    }
    if (/(^|\s)-m(\s|$)/.test(lower)) {
      return 'm';
    }
    if (/(^|\s)-l(\s|$)/.test(lower)) {
      return 'l';
    }
    return 'none';
  }

  private stripPriority(text: string): string {
    return text.replace(/(^|\s)-[hml](?=\s|$)/gi, '').replace(/\s{2,}/g, ' ').trim();
  }

  private getPriorityIcon(priority: 'h' | 'm' | 'l' | 'none'): vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined {
    if (priority === 'h') {
      return this.getIconPath('priority-high.svg');
    }
    if (priority === 'm') {
      return this.getIconPath('priority-medium.svg');
    }
    if (priority === 'l') {
      return this.getIconPath('priority-low.svg');
    }
    return undefined;
  }

  private getIconPath(filename: string): { light: vscode.Uri; dark: vscode.Uri } {
    const base = path.join(__filename, '..', '..', 'media', filename);
    const uri = vscode.Uri.file(base);
    return { light: uri, dark: uri };
  }
}

// UI
class TodoItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
  }
}