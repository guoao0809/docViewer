# DocViewer V2.0 UI Redesign — Design Spec

**Date:** 2026-06-09
**Status:** draft
**Scope:** Full UI overhaul — three-column layout (navigation + document list + content), remove TabBar, add opened-docs history panel

## Goal

Redesign the DocViewer UI to match the provided design mockup: a three-column layout with a navigation sidebar, a document list panel (showing opened-docs history), and a content viewer.

## Architecture

### Layout

```
┌─────────────────────────────────────────────────────┐
│  AppHeader (search bar centered, theme toggle)       │
──────────┬──────────────────────┬────────────────────
│ Sidebar  │  DocumentList        │  ContentViewer     │
│ (nav +   │  (opened-docs        │  (markdown         │
│  tree)   │   history)           │   rendered)        │
├──────────┴──────────────────────┴────────────────────
│  StatusBar (doc count, word count, size, modified)   │
└─────────────────────────────────────────────────────┘
```

### Left Column — Navigation Sidebar

**Width:** 240px (from settingStore)

**Structure:**
1. **"+ 添加文档" button** — blue primary button, calls `handleOpenFolder()`
2. **Navigation menu** — vertical list:
   - 🕐 最近打开 (Recent)
   - ⭐ 收藏夹 (Favorites)
   - 📁 全部文档 (All Documents)
   - 🔍 搜索历史 (Search History)
3. **"项目" section header** with "+" button to add folder
4. **Folder tree** — collapsible tree of opened root folders, each showing file count
   - Root folders are top-level items (e.g., "开发文档 (8)", "产品设计 (2)")
   - Children are files and subfolders
   - Clicking a file adds it to the opened-docs list and shows content
5. **"⚙ 设置" button** at bottom

**Active nav item** is highlighted with a light blue background.

### Middle Column — Document List

**Width:** flexible (1fr)

**Header:** "全部文档" title + document count + grid/list view toggle icon

**List items** (each row):
- File type icon (M for markdown, J for JSON, PDF icon, etc.)
- File name (bold)
- Date + size + folder tag (gray text below name)
- Star icon (☆/★) for favorite toggle on the right

**Behavior:**
- Clicking a file in the left tree adds it to this list and shows content in the right panel
- Clicking an item in this list switches the right panel to that document
- Items can be removed from the list (X button on hover)
- List is the "opened-docs history" — persists to localStorage

### Right Column — Content Viewer

**Width:** flexible (1fr, takes remaining space)

**Header:** Document title + action buttons (edit, copy, more)

**Content:** Rendered markdown HTML (reuses existing `markdownService.ts`)

**No TOC panel** — the right column is full-width content.

### StatusBar

- Left: "总计: N 个文档"
- Right: "字数: X | 行数: Y | 大小: Z | 修改时间: ..."

## Data Model Changes

### `documentStore.ts`

Add `openedDocs: DocMeta[]` — list of documents that have been opened (clicked in tree or list).

```ts
const openedDocs = ref<DocMeta[]>([])
const activeDocId = ref<string | null>(null)

function doOpenDoc(doc: DocMeta) {
  // Add to openedDocs if not already there
  if (!openedDocs.value.find(d => d.id === doc.id)) {
    openedDocs.value.unshift(doc)
  }
  activeDocId.value = doc.id
  doLoadDocument(doc.id)
}

function doRemoveOpenedDoc(docId: string) {
  openedDocs.value = openedDocs.value.filter(d => d.id !== docId)
  if (activeDocId.value === docId) {
    activeDocId.value = openedDocs.value.length > 0 ? openedDocs.value[0].id : null
  }
}
```

Persist `openedDocs` and `activeDocId` to localStorage.

### `tabStore.ts`

Keep the store but it's no longer used for UI. The `openedDocs` in `documentStore` replaces its role.

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `src/components/layout/MainLayout.vue` | Modify | Three-column layout rewrite |
| `src/components/layout/Sidebar.vue` | Rewrite | Navigation panel with menu + folder tree |
| `src/components/layout/DocumentList.vue` | Create | Middle column document list |
| `src/components/layout/TabBar.vue` | Delete | No longer needed |
| `src/components/viewer/ContentViewer.vue` | Create | Right column content viewer (wraps MarkdownViewer) |
| `src/components/viewer/TocPanel.vue` | Delete | No longer needed |
| `src/components/layout/StatusBar.vue` | Modify | Update status info |
| `src/stores/documentStore.ts` | Modify | Add openedDocs, activeDocId, doOpenDoc, doRemoveOpenedDoc |
| `src/App.vue` | Modify | Remove TabBar reference if any |
| `src/style.css` | Modify | Add new CSS variables if needed |

## Folder Tag Logic

Each document's "folder tag" in the document list = the name of the root folder it belongs to. For example:
- `C:\Users\...\开发文档\readme.md` → tag: "开发文档"
- `C:\Users\...\产品设计\ui.sketch` → tag: "产品设计"

This is derived from `rootPaths` in `documentStore` — find which root path is a prefix of the document's path.

## Migration Notes

- Existing `localStorage` data (`docviewer-tabs`) will be orphaned but harmless
- `docviewer-state` needs migration: add `openedDocs: []` and `activeDocId: null` defaults
- `tabStore` persists `docviewer-tabs` key — can be cleaned up later
