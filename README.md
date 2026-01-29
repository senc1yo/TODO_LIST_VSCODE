# Todo Panel

Todo Panel scans your workspace source files and lists `// TODO` comments in a dedicated view and a colored webview. Clicking an item opens the file at the matching line.

## Features

- Tree view showing TODOs found under `src/` for common source file types.
- Priority markers using `-h`, `-m`, and `-l` to visually highlight important TODOs.
- Webview panel with color-coded TODOs and click-to-open links.
- Status bar item to open the TODOs panel quickly.

## Usage

1. Add TODOs in your code, for example:
	`// TODO -h Fix the caching bug`
2. Open the **TODOs** view in the activity bar or run **Todo Panel: Open TODOs Webview**.
3. Click any item to jump to the line.

## Commands

- **Todo Panel: Refresh** (`todoPanel.refresh`) – refresh the list.
- **Todo Panel: Open TODOs Webview** (`todoPanel.openWebview`) – open the colored TODOs panel.

## Requirements

No additional requirements.

## Extension Settings

This extension does not contribute any settings.

## Known Issues

- Only TODOs in `src/` are indexed.
- Only single-line `// TODO` comments are supported.

## Release Notes

### 0.0.1

Initial preview release.
