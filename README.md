# Todo Panel

Todo Panel scans your workspace source files and lists TODO comments in a dedicated view and a colored webview. Clicking an item opens the file at the matching line.

## Features

- Tree view showing TODOs found under `src/` for common source file types.
- Priority markers using `-h`, `-m`, and `-l` to visually highlight important TODOs.
- Webview panel with color-coded TODOs and click-to-open links.
- Status bar item to open the TODOs panel quickly.
- Choose what folders can contain TODOs

## Usage

1. Add TODOs in your code, for example:
	`// TODO -h Fix the caching bug`
	`/* TODO -m Refactor styles */`
	`<!-- TODO -l Update markup -->`
	`# TODO Improve logging`
2. Open the **TODOs** view in the activity bar or run **Todo Panel: Open TODOs Webview**.
3. Click any item to jump to the line.

## Commands

- **Todo Panel: Refresh** (`todoPanel.refresh`) – refresh the list.
- **Todo Panel: Open TODOs Webview** (`todoPanel.openWebview`) – open the colored TODOs panel.

## Requirements

No additional requirements.

## Extension Settings

- **todoPanel.includeFolders**: Workspace-relative folders to scan for TODOs (default: `src`).

## Known Issues

- Only TODOs in the configured folders are indexed.

## Release Notes

### 0.0.1

Initial preview release.
