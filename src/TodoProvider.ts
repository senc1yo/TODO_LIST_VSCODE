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
  private readonly watchers: vscode.FileSystemWatcher[] = [];
  private readonly fileExtensions = ['ts', 'js', 'py', 'java', 'c', 'cpp', 'cs', 'html', 'css'];
  private readonly todoPatterns: RegExp[] = [
    /\/\/\s*TODO\b(?::\s*(.*))?/,
    /\/\*\s*TODO\b(?::\s*(.*?))?\*\//,
    /<!--\s*TODO\b(?::\s*(.*?))?\s*-->/,
    /#\s*TODO\b(?::\s*(.*))?/
  ];

  constructor(context: vscode.ExtensionContext) {
    this.resetWatchers();

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        if (this.shouldRefreshForPath(event.document.uri.fsPath)) {
          this.refresh();
        }
      })
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('todoPanel.includeFolders')) {
          this.resetWatchers();
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

    const includeGlobs = this.getIncludeGlobs();
    const fileMap = new Map<string, vscode.Uri>();

    for (const includeGlob of includeGlobs) {
      const files = await vscode.workspace.findFiles(includeGlob, '**/node_modules/**');
      for (const file of files) {
        fileMap.set(file.fsPath, file);
      }
    }

    for (const fileUri of fileMap.values()) {
      let text = '';
      try {
        text = await fs.promises.readFile(fileUri.fsPath, 'utf8');
      } catch {
        continue;
      }

      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const extracted = this.extractTodo(line);

        if (extracted) {
          const rawComment = extracted.rawComment;
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

  private extractTodo(line: string): { rawComment: string } | null {
    for (const pattern of this.todoPatterns) {
      const match = line.match(pattern);
      if (match) {
        return { rawComment: match[1]?.trim() || 'TODO' };
      }
    }
    return null;
  }

  private resetWatchers(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers.length = 0;

    const includeGlobs = this.getIncludeGlobs();
    for (const includeGlob of includeGlobs) {
      const watcher = vscode.workspace.createFileSystemWatcher(includeGlob);
      this.watchers.push(watcher);
      this.disposables.push(
        watcher,
        watcher.onDidCreate(() => this.refresh()),
        watcher.onDidChange(() => this.refresh()),
        watcher.onDidDelete(() => this.refresh())
      );
    }
  }

  private getIncludeGlobs(): string[] {
    const folders = this.getIncludeFolders();
    const extensionGlob = `**/*.{${this.fileExtensions.join(',')}}`;

    if (folders.length === 0) {
      return [extensionGlob];
    }

    return folders.map(folder => {
      const normalized = folder.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '').trim();
      if (!normalized || normalized === '.') {
        return extensionGlob;
      }
      return `${normalized}/${extensionGlob}`;
    });
  }

  private getIncludeFolders(): string[] {
    const config = vscode.workspace.getConfiguration('todoPanel');
    const folders = config.get<string[]>('includeFolders', ['src']);
    return Array.isArray(folders) ? folders.filter(Boolean) : ['src'];
  }

  private shouldRefreshForPath(filePath: string): boolean {
    const folders = this.getIncludeFolders();
    if (folders.length === 0) {
      return true;
    }

    const relative = vscode.workspace.asRelativePath(filePath, false).replace(/\\/g, '/');
    return folders.some(folder => {
      const normalized = folder.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '').trim();
      if (!normalized || normalized === '.') {
        return true;
      }
      return relative === normalized || relative.startsWith(`${normalized}/`);
    });
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