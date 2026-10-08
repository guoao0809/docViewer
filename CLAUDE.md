# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install         # install deps (project pins pnpm@11 via packageManager)
pnpm run dev         # Vite dev server, port 1420 (strictPort)
pnpm run build       # vue-tsc --noEmit type-check + vite build
pnpm run tauri dev   # Full Tauri app: Rust backend + Vite dev + native window
pnpm run tauri build # Production build (frontend + Rust, outputs installers)
```

`npm run tauri *` also works — the `"tauri": "tauri"` script is a passthrough. No test infrastructure is configured; verification is `vue-tsc --noEmit`, `vite build`, and `cd src-tauri && cargo check`.

## Architecture

**Tauri v2 desktop app** — Vue 3 + TypeScript frontend, Rust backend. A local documentation viewer: open folders, read Markdown/text/config files with syntax highlighting, full-text search, inline editing, and preview of images/PDF. All state persists to `localStorage`.

### Rust backend (`src-tauri/src/lib.rs`)

Nine `#[tauri::command]`s registered in `invoke_handler`:
- `scan_directory(path)` — recursive walk (max depth 10), returns `Vec<serde_json::Value>` tree (frontend casts to `DocMeta[]`); directories first, then case-insensitive. Skips hidden (`.`-prefixed) entries and dirs containing no supported files.
- `read_document(path)` — BOM-aware read via `encoding_rs`, returns UTF-8 string.
- `read_file_bytes(path)` — raw `Vec<u8>` (invoke delivers a `number[]`; the frontend wraps it into an `ArrayBuffer`). Used for image/PDF preview.
- `get_file_metadata(path)` — `{ size, modified, type }`.
- `write_document(path, content)` — writes file (edit-mode auto-save).
- `create_file(path, name)` / `create_folder(path, name)` — create empty file/folder, return full path.
- `rename_path(path, new_name)` — in-place rename; rejected if the target exists (no overwrite) or if `new_name` contains a path separator. Returns the new path.
- `trash_path(path)` — moves a file/folder to the **system recycle bin** via the `trash` crate (recoverable delete).

`detect_file_type` classifies by extension into `markdown` | `code` | `image` | `text` | `pdf`.
Supported extensions: `.md`, `.markdown`, `.txt`, `.json`, `.yaml`, `.yml`, `.toml`, `.xml`, `.csv`, images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`), and `.pdf`.

**Plugins** (registered in `run()`): `single-instance`, `fs`, `dialog`, `clipboard-manager`, `opener`, plus `log` in debug builds.

**Scope note:** `scan_directory`, `read_document`, `write_document`, `read_file_bytes`, `rename_path`, `trash_path`, etc. are custom Rust commands and are **not** subject to `tauri-plugin-fs` scope restrictions — they can access any path the OS user can. Only `fileExists` (plugin `exists`) is scope-bound. `capabilities/default.json` grants `fs:allow-read*`, `fs:allow-exists`, `dialog:allow-open`, window controls (incl. `core:window:allow-set-always-on-top`), `opener:allow-open-url` + `opener:allow-default-urls` (external links), `opener:allow-reveal-item-in-dir` (reveal in file explorer), and `clipboard-manager:allow-write-text` (copy path).

**Window behavior:** the close button hides to tray (`prevent_close` + `window.hide()`) rather than quitting; a tray menu (显示窗口 / 退出) shows or exits. `AppHeader` has a pin toggle calling `set_always_on_top`.

### Frontend

**Entry**: `src/main.ts` → Vue app + Pinia → mounts `#app`.
**Root**: `src/App.vue` renders `MainLayout` (slot: `ContentViewer`) plus a global `SearchOverlay`; `useKeyboard()` installs shortcuts.
**Empty state**: `ContentViewer` renders an inline "打开一个文档" placeholder when no document is open.
**Path alias**: `@/` → `src/` (tsconfig + vite.config). Vite port 1420, `strictPort: true`.

**Unused leftovers** (safe to ignore, but don't mistake for live code): `src/pages/WelcomePage.vue`, `MarkdownViewer`, `src/stores/tabStore.ts` + `src/types/tab.ts`, and `settingStore.tocPanelWidth` — nothing imports them.

### Key invariants

- **A tree node's `id` IS its absolute path** (`id === path`). Renaming must update `id` *and* `path` across the subtree, `rootPaths`, `openedDocs`, `activeDocId`, `selectedNodeId`, and `expandedDirs` keys. Windows paths use backslashes — never compare a normalized (forward-slash) path against a node id.
- `currentDoc.meta` and `openedDocs` entries are the **same object references** as their tree nodes, so mutating a node updates them by aliasing.
- The search index must skip non-text files (`image`/`pdf`) — see `flattenDocs` in `searchService.ts`.

### Styling — Tailwind 4 + semantic tokens

`src/style.css` does `@import "tailwindcss"` then an `@theme` block mapping semantic names to CSS variables (`--color-bg` → `--bg`, etc.), so components use `bg-bg`, `text-title`, `border-border`, `text-text/50`, `bg-hover`, `bg-active`. Theme variables live on `:root[data-theme="dark"]` / `:root[data-theme="light"]`; `settingStore` toggles `data-theme` on `<html>`. The `.markdown-content` block styles rendered HTML and must stay CSS-class-based (the HTML is dynamic, via `v-html`). Add colors through this token system, not hardcoded values.

### UI components — shadcn-vue style

`src/components/ui/` holds primitives built on **reka-ui** + **class-variance-authority** (Button, Input, Badge, Dialog, ScrollArea, Separator, Tooltip) plus two standalone pieces: `ConfirmDialog.vue` (props `open`/`title`/`description`, optional `showSkip` and `danger`) and `ContextMenu.vue` (a lightweight self-built menu — Teleport to body, positioned at x/y, closes on outside-click / Esc / blur / resize; props `x`/`y`/`items`). Use the `cn()` helper (`src/lib/utils.ts` — clsx + tailwind-merge). Icons come from `lucide-vue-next`.

### Pinia stores (`src/stores/`)

`documentStore` persists to `docviewer-state`; others use their own `docviewer-*` keys; all restore on creation.

| Store | Key data |
|---|---|
| `documentStore` | `docTree`, `currentDoc`, `openedDocs`, `activeDocId`, `rootPaths`, `expandedDirs`, `selectedNodeId`; context-menu state (`contextMenu`, `renamingNodeId`, `pendingRemove*`, `pendingTrash*`); actions incl. `doScanDirectory`, `doLoadDocument`, `doOpenDoc`, `doRenameNode`, `doConfirmTrash`, `doCopyPath`, `doRevealInExplorer` |
| `searchStore` | `query`, `results`, `isOpen`, `highlightTarget`, history (max 20); `doBuildIndex`, `doClearHighlight` |
| `settingStore` | `theme` (dark/light), `sidebarWidth`, `sidebarCollapsed`, `fontSize` (`tocPanelWidth` is unused) |

### Services (`src/services/`)

- **`tauriService.ts`** — data access wrappers over the Rust commands (`scanDirectory`, `readDocument`, `getFileMetadata`, `readFileBytes`, `writeDocument`, `createFile`, `createFolder`, `renamePath`, `trashPath`); `fileExists` uses the plugin `exists`; `openFileDialog` uses the plugin `open` (directory picker).
- **`markdownService.ts`** — `parseMarkdown(raw, meta)` → `DocContent`. Uses `markdown-it` + `markdown-it-anchor`, DOMPurify sanitization, Shiki highlighting (lazy singleton, `vitesse-dark`/`vitesse-light`, 17+ languages). `linkify: true` is on, so bare URLs become anchors.
- **`searchService.ts`** — **MiniSearch** in-memory inverted index over file *contents*. `buildIndex(docs, readDoc, onProgress)` reads each **text** leaf (skips files >1 MB and non-text types), indexing `name`/`content`/`path` (name boosted 2×, prefix + fuzzy 0.2); `searchIndex(query)` returns the top 20 results with snippet and line number.

### Content viewing & editing (`src/components/viewer/ContentViewer.vue`)

- **Text/markdown/code**: switches between **view** mode (rendered `v-html` from `currentDoc.html`) and **edit** mode (CodeMirror 6 with `lineNumbers`, history, markdown/json extensions). Edit mode auto-saves 1.5 s after changes stop, on document switch, and on exit. The edit button only shows for `markdown`/`code`/`text`.
- **Image & PDF**: rendered by `OpenFileViewer` from `@open-file-viewer/vue`, fed a `Blob` built from `currentDoc.bytes`. Plugins: `imagePlugin()` for images (toolbar hides search/download, keeps zoom/rotate/fullscreen), `pdfPlugin({ workerSrc })` with the worker imported as `pdfjs-dist/build/pdf.worker.mjs?url`. Import the library CSS as `@open-file-viewer/core/style.css` (the `exports` map only allows the `./style.css` subpath, **not** `./dist/style.css`).
- **External links**: clicks/right-clicks on `http(s)/mailto/tel` anchors are intercepted — `preventDefault()` then a `ConfirmDialog`, and only on confirm does `openUrl()` (plugin `opener`) hand off to the system browser. In-page `#anchor` links keep default scroll behavior.
- **Search highlighting**: after navigating from a search result, text nodes in `.markdown-content` are walked and matches wrapped in `<mark>`, then scrolled into view — driven by `searchStore.highlightTarget`.

### File tree & context menu

`src/components/sidebar/DocTree.vue` renders the tree (filtering + a single `ContextMenu` and trash `ConfirmDialog` at this level); `DocTreeRecursive.vue` renders each node, handles click/right-click, inline create, and inline rename. Right-clicking a node opens the menu with **复制文件路径 / 在文件资源管理器中显示 / 重命名 / 删除** (all four apply to files and folders). Deletion always confirms first, then moves to the recycle bin.

### Layout (`src/layouts/MainLayout.vue`)

**Two columns**: `Sidebar` (collapsible, resizable 180–400px) | content `slot`. `AppHeader` on top, `StatusBar` at the bottom.

### Keyboard shortcuts (`src/composables/useKeyboard.ts`)

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+K` | Open search |
| `Ctrl/Cmd+W` | Close active document |
| `Ctrl/Cmd+Tab` | Next open document |
| `Ctrl/Cmd+Shift+Tab` | Previous open document |
| `Ctrl/Cmd+\` | Toggle sidebar |
| `Escape` | Close search overlay |

### Key types (`src/types/`)

- `DocMeta` — tree node: `id`, `name`, `path`, `type` (`'markdown' | 'text' | 'code' | 'image' | 'pdf'`), `size`, `modified`, `tags`, `children?`.
- `DocContent` — `{ meta, raw, html, toc: TocItem[], bytes?: ArrayBuffer }` (`bytes` only for image/pdf).
- `SearchResult` (`search.ts` — `docId`, `fileName`, `snippet`, `score`, `line`, `matchText`, `terms`). `TabItem` (`tab.ts`) belongs to the unused `tabStore`.
