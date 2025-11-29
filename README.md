# SecureAuth (Chrome/Edge Extension)

A small browser extension that lets you maintain a simple whitelist of domains where the extension is allowed to run. Includes an Options page to add/remove whitelisted hostnames.

## Features

- Add and remove host-only domains (e.g. `example.com`) from a whitelist via `options.html`.
- Lightweight manifest-based extension with background and content scripts.

## Install (Developer / Local)

1. Open the browser (Chrome or Edge).
2. Go to `chrome://extensions/` (or `edge://extensions/`).
3. Enable "Developer mode".
4. Click "Load unpacked" and select the project folder (the folder that contains `manifest.json`).

## Usage

- Open the extension's Options page (there is an `options.html` in the project) to add or remove whitelisted domains. Use host-only values like `example.com`.

## Project files

- `manifest.json` — extension manifest and permissions
- `background.js` — background script
- `content.js` — content script
- `options.html` — options (UI) page
- `options.js` — options page logic
- `icon/icon.png` — extension icon

## Development

- Edit the HTML/JS files and reload the extension from the browser's Extensions page to apply changes.
- Use the browser console (background page and content script consoles) for debugging.

## Contributing

Open issues or submit PRs. Keep changes focused and provide clear descriptions.

## License

MIT — see `LICENSE` if you add one.
