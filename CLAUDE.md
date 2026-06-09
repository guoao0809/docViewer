# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server on port 1420
npm run build        # vue-tsc --noEmit type-check + vite build
npm run tauri dev    # Full Tauri app: Rust backend + Vite dev + native window
npm run tauri build  # Production build (frontend + Rust)
```

No test infrastructure is configured.

## Architecture

**Tauri v2 desktop app** — Vue 3 + TypeScript frontend, Rust backend. A local documentation viewer that opens a folder and renders Markdown/text/config files with syntax highlighting.

### Rust backend (`src-tauri/src/lib.rs`)

Three Tauri commands registered in `invoke_handler`:
- `scan_directory(path)` — recursive walk (max depth 10), returns `Vec<DocMeta>` tree sorted directories-first, case-insensitive. Skips hidden entries (`.` prefix).
- `read_document(path)` — BOM-aware file read via `encoding_rs`, returns UTF-8 string.
- `get_file_metadata(path)` — returns `{ size, modified, type }`.

Supported extensions: `.md`, `.markdown`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.xml`, `.csv`.

FS permissions in `src-tauri/capabilities/default.json` are scoped to `$HOME`, `$DOWNLOAD`, `$DESKTOP`, `$DOCUMENT`.

### Frontend

**Entry**: `src/main.ts` → creates Vue app + Pinia → mounts `#app`.

**Root**: `src/App.vue` — shows `WelcomePage` when no root path is set, otherwise `MarkdownViewer`. Both wrapped in `MainLayout`. `SearchOverlay` is globally rendered. `useKeyboard` composable activates global shortcuts.

**Path alias**: `@/` → `src/` (tsconfig + vite.config).

### Pinia stores (`src/stores/`)

All stores persist to `localStorage` with `docviewer-*` keys and restore on creation.

| Store | Key data | localStorage key |
|---|---|---|
| `documentStore` | `docTree`, `currentDoc`, `rootPath`, `expandedDirs`, favorites | `docviewer-state` |
| `tabStore` | `tabs[]`, `activeTabId`, pin/scroll state | `docviewer-tabs` |
| `searchStore` | `query`, `results`, `isOpen`, history (max 20) | `docviewer-search-history` |
| `settingStore` | `theme` (dark/light), `sidebarWidth`, `sidebarCollapsed`, `tocPanelWidth`, `fontSize` | per-setting keys |

### Services (`src/services/`)

- **`tauriService.ts`** — data access: `scanDirectory` (uses `@tauri-apps/plugin-fs` `readDir`), `readDocument` (`readTextFile`), `getFileMetadata` (Tauri `invoke`), `openFileDialog` (`@tauri-apps/plugin-dialog`).
- **`markdownService.ts`** — `parseMarkdown(raw, meta)` → `DocContent`. Uses `markdown-it` + `markdown-it-anchor`, DOMPurify sanitization, Shiki highlighting (lazy singleton, `vitesse-dark`/`vitesse-light` themes, 17 languages).
- **`searchService.ts`** — Fuse.js fuzzy search on `name` (weight 0.6) and `path` (weight 0.4), top 20 results.

### Key types (`src/types/`)

- `DocMeta` — tree node: `id`, `name`, `path`, `type` (`'markdown'|'text'|'code'`), `size`, `modified`, `favorite`, `children?`, etc.
- `DocContent` — `{ meta, raw, html, toc: TocItem[] }`
- `TabItem` — `{ docId, title, pinned, scrollTop }`
- `SearchResult` — `{ docId, fileName, snippet, score, line }`

### Layout (`src/layouts/MainLayout.vue`)

Three-column: Sidebar | TabBar+Content | TocPanel. AppHeader top, StatusBar bottom. Column widths from `settingStore`.

### Keyboard shortcuts (`src/composables/useKeyboard.ts`)

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+K` | Open search |
| `Ctrl/Cmd+D` | Toggle favorite |
| `Ctrl/Cmd+W` | Close active tab |
| `Ctrl/Cmd+Tab` | Next tab |
| `Ctrl/Cmd+Shift+Tab` | Previous tab |
| `Ctrl/Cmd+\` | Toggle sidebar |
| `Escape` | Close search overlay |

### Theming

CSS custom properties on `:root[data-theme="dark"]` / `:root[data-theme="light"]` in `src/style.css`. Variables: `--bg`, `--sidebar`, `--panel`, `--text`, `--title`, `--primary`, `--border`, `--hover-bg`, `--active-bg`. `settingStore` toggles `data-theme` on `<html>`.