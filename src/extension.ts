import * as vscode from 'vscode';
import { TodoEntry, TodoProvider } from './TodoProvider';

export function activate(context: vscode.ExtensionContext) {

	const todoProvider = new TodoProvider(context);

	// rtegister Tree View
	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('todoPanel.listView', todoProvider)
	);

	// register the Refresh Command
	context.subscriptions.push(
		vscode.commands.registerCommand('todoPanel.refresh', () => todoProvider.refresh())
	);

	// register the click to open
	context.subscriptions.push(
		vscode.commands.registerCommand('todoPanel.openFile', (fileUri: vscode.Uri | string, lineNumber: number) => {
		const targetUri = typeof fileUri === 'string' ? vscode.Uri.parse(fileUri) : fileUri;
		vscode.window.showTextDocument(targetUri).then(editor => {
			// Create a range for the specific line
			const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
			
			// Move cursor and scroll to that line
			editor.selection = new vscode.Selection(range.start, range.end);
			editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
		});
		})
	);

	//register webview panel
	let webviewPanel: vscode.WebviewPanel | undefined;
	const renderWebview = async () => {
		if (!webviewPanel) {
			return;
		}
		const todos = await todoProvider.getTodos();
		webviewPanel.webview.html = getWebviewHtml(todos);
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('todoPanel.openWebview', async () => {
			if (webviewPanel) {
				webviewPanel.reveal(vscode.ViewColumn.Beside);
				await renderWebview();
				return;
			}

			webviewPanel = vscode.window.createWebviewPanel(
				'todoPanel.webview',
				'Project TODOs (Colored)',
				vscode.ViewColumn.Beside,
				{ enableCommandUris: true }
			);

			webviewPanel.onDidDispose(() => {
				webviewPanel = undefined;
			});

			await renderWebview();
		})
	);

	context.subscriptions.push(
		todoProvider.onDidChangeTreeData(() => {
			void renderWebview();
		})
	);

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = '$(checklist) TODOs';
	statusBarItem.tooltip = 'Open TODOs Webview';
	statusBarItem.command = 'todoPanel.openWebview';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);
}

function getWebviewHtml(todos: TodoEntry[]): string {
	const rows = todos.map(todo => {
		const color = todo.priority === 'h'
			? '#EF959D'
			: todo.priority === 'm'
				? '#fcddbc'
				: todo.priority === 'l'
					? '#B8D8BA'
					: 'var(--vscode-foreground)';

		const commandArgs = encodeURIComponent(JSON.stringify([todo.fileUri.toString(), todo.lineNumber]));
		const commandUri = `command:todoPanel.openFile?${commandArgs}`;

		return `
			<li class="todo-item">
				<a class="todo-link" href="${commandUri}" style="color: ${color};">
					${escapeHtml(todo.label)}
				</a>
				<span class="todo-meta">${escapeHtml(todo.description)}</span>
			</li>
		`;
	}).join('');

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Project TODOs</title>
	<style>
		body {
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			padding: 12px;
		}
		.todo-list {
			list-style: none;
			padding: 0;
			margin: 0;
		}
		.todo-item {
			display: flex;
			flex-direction: column;
			gap: 2px;
			padding: 8px 0;
			border-bottom: 1px solid var(--vscode-panel-border);
		}
		.todo-link {
			text-decoration: none;
			font-weight: 600;
		}
		.todo-link:hover {
			text-decoration: underline;
		}
		.todo-meta {
			color: var(--vscode-descriptionForeground);
			font-size: 0.85em;
		}
	</style>
</head>
<body>
	<ul class="todo-list">
		${rows || '<li>No TODOs found.</li>'}
	</ul>
</body>
</html>`;
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function deactivate() {}