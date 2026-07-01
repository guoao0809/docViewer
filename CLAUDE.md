# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server, port 1420 (strictPort)
npm run build        # vue-tsc --noEmit type-check + vite build
npm run tauri dev    # Full Tauri app: Rust backend + Vite dev + native window
npm run tauri build  # Production build (frontend + Rust, outputs installers)
```

`npm run tauri *` works through the `"tauri": "tauri"` script passthrough. No test infrastructure is configured.

## Architecture

**Tauri v2 desktop app** — Vue 3 + TypeScript frontend, Rust backend. A local documentation viewer: open a folder and render Markdown/text/config files with syntax highlighting, full-text search, inline editing, and image preview. All state persists to `localStorage`.

### Rust backend (`src-tauri/src/lib.rs`)

Seven Tauri commands registered in `invoke_handler`:
- `scan_directory(path)` — recursive walk (max depth 10), returns `Vec<serde_json::Value>` tree (frontend casts to `DocMeta[]`); directories first, then case-insensitive. Skips hidden (`.`-prefixed) entries and empty dirs containing no supported files.
- `read_document(path)` — BOM-aware read via `encoding_rs`, returns UTF-8 string.
- `get_file_metadata(path)` — `{ size, modified, type }`.
- `read_image_base64(path)` — image bytes as a base64 string (for the image viewer).
- `write_document(path, content)` — writes file (used by edit-mode auto-save).
- `create_file(path, name)` / `create_folder(path, name)` — create empty file/folder, return full path.

`detect_file_type` classifies by extension into `markdown` | `code` | `image` | `text`.

Supported extensions: `.md`, `.markdown`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.xml`, `.csv`, plus images `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`.

**Scope note:** `scan_directory`, `read_document`, `write_document`, etc. are custom Rust commands and are **not** subject to `tauri-plugin-fs` scope restrictions — they can read/write any path the OS user can access. Only `fileExists` (plugin `exists`) is scope-bound. `capabilities/default.json` grants `fs:allow-read*`, `fs:allow-exists`, `dialog:allow-open`, and window controls including `core:window:allow-set-always-on-top`.

Window behavior: the close button is intercepted to **hide to tray** (`prevent_close` + `window.hide()`) rather than quit; a system-tray menu (显示窗口 / 退出) shows or exits the app. `AppHeader` has a pin toggle that calls `set_always-on-top`.

### Frontend

**Entry**: `src/main.ts` → creates Vue app + Pinia → mounts `#app`.
**Root**: `src/App.vue` — shows `WelcomePage` when no root path is set, otherwise `MarkdownViewer`; both wrapped in `MainLayout`. `SearchOverlay` is globally rendered. `useKeyboard` composable activates global shortcuts.
**Path alias**: `@/` → `src/` (tsconfig + vite.config). Vite uses port 1420 with `strictPort: true`.

### Styling — Tailwind 4 + semantic tokens

`src/style.css` does `@import "tailwindcss"` then an `@theme` block that maps semantic color names to CSS variables (`--color-bg` → `--bg`, etc.), so components use Tailwind classes like `bg-bg`, `text-title`, `border-border`, `text-text/50`. Theme variables (`--bg`, `--sidebar`, `--panel`, `--text`, `--title`, `--primary`, `--border`, `--hover-bg`, `--active-bg`) are defined on `:root[data-theme="dark"]` / `:root[data-theme="light"]`; `settingStore` toggles `data-theme` on `<html>`. The `.markdown-content` block styles rendered HTML and must stay CSS-class-based because the HTML is dynamic (`v-html`). Add new colors through this token system, not hardcoded values.

### UI components — shadcn-vue style

`src/components/ui/` holds primitives built on **reka-ui** + **class-variance-authority** (Button, Input, Badge, Dialog, ScrollArea, Separator, Tooltip, plus `ConfirmDialog`). Follow this pattern and the `cn()` helper (`src/lib/utils.ts` — clsx + tailwind-merge) when adding components. Icons come from `lucide-vue-next`.

### Pinia stores (`src/stores/`)

All persist to `localStorage` with `docviewer-*` keys and restore on creation.

| Store | Key data | localStorage key |
|---|---|---|
| `documentStore` | `docTree`, `currentDoc`, `rootPath`, `expandedDirs`, favorites; actions `doScanDirectory`, `doLoadDocument` | `docviewer-state` |
| `tabStore` | `tabs[]`, `activeTabId`, pin/scroll state | `docviewer-tabs` |
| `searchStore` | `query`, `results`, `isOpen`, `highlightTarget`, history (max 20); `doClearHighlight` | `docviewer-search-history` |
| `settingStore` | `theme` (dark/light), `sidebarWidth`, `sidebarCollapsed`, `docListCollapsed`, `tocPanelWidth`, `fontSize` | per-setting keys |

### Services (`src/services/`)

- **`tauriService.ts`** — data access. `scanDirectory`, `readDocument`, `getFileMetadata`, `readImageBase64`, `writeDocument`, `createFile`, `createFolder` call Rust commands via `invoke`; `fileExists` uses the plugin `exists`; `openFileDialog` uses the plugin `open` (directory picker).
- **`markdownService.ts`** — `parseMarkdown(raw, meta)` → `DocContent`. Uses `markdown-it` + `markdown-it-anchor`, DOMPurify sanitization, Shiki highlighting (lazy singleton, `vitesse-dark`/`vitesse-light` themes, 17+ languages).
- **`searchService.ts`** — **MiniSearch** in-memory inverted index over file *contents* (not just names). `buildIndex(docs, readDoc, onProgress)` reads each leaf file (skips files >1 MB), indexing `name`/`content`/`path` (name boosted 2×, prefix + fuzzy 0.2); `searchIndex(query)` returns the top 20 results with snippet and line number. The index must be built before search.

### Content viewing & editing (`src/components/viewer/`)

`ContentViewer.vue` switches between **view** mode (rendered `v-html` from `currentDoc.html`) and **edit** mode (CodeMirror 6 with `lineNumbers`, history, and markdown/json language extensions). Edit mode auto-saves 1.5 s after changes stop, and also saves on document switch and on exit. For `type === 'image'`, it renders a base64 image viewer with zoom/rotate controls. Search highlights are applied by walking text nodes in `.markdown-content` and wrapping matches in `<mark>`, then scrolling to the first match — driven by `searchStore.highlightTarget`.

### Layout (`src/layouts/MainLayout.vue`)

Three-column: Sidebar | TabBar + Content | TocPanel. AppHeader top, StatusBar bottom. Column widths come from `settingStore`.

### Keyboard shortcuts (`src/composables/useKeyboard.ts`)

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+K` | Open search |
| `Ctrl/Cmd+D` | Toggle favorite |
| `Ctrl/Cmd+W` | Close active tab |
| `Ctrl/Cmd+Tab` | Next tab |
| `Ctrl/Cmd+Shift+Tab` | Previous tab |
| `Ctrl/Cmd+\` | Toggle sidebar |
| `Ctrl/Cmd+Shift+\` | Toggle document list |
| `Escape` | Close search overlay |

### Key types (`src/types/`)

- `DocMeta` — tree node: `id`, `name`, `path`, `type` (`'markdown' | 'text' | 'code' | 'image'`), `size`, `modified`, `favorite`, `tags`, `lastOpen`, `visitCount`, `children?`.
- `DocContent` — `{ meta, raw, html, toc: TocItem[] }`.
- `TabItem` (`tab.ts`), `SearchResult` (`search.ts` — includes `docId`, `fileName`, `snippet`, `score`, `line`, `matchText`, `terms`).
