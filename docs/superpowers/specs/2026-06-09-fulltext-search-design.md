# Full-Text Search with Minisearch + Result Jump & Highlight

**Date:** 2026-06-09
**Status:** draft
**Scope:** `src/services/searchService.ts`, `src/stores/searchStore.ts`, `src/types/search.ts`, `src/components/search/SearchOverlay.vue`, `src/components/viewer/MarkdownViewer.vue`

## Problem

Current search (Fuse.js) only indexes `name` and `path` fields of `DocMeta`. Users cannot search document **content**. When a search result is clicked, it simply opens the file — no scroll-to-match or highlight.

## Goal

1. **Full-text search** across all scanned documents using Minisearch
2. **Content snippets** in search results showing matching context
3. **Jump to match** — clicking a result scrolls to the matching text line
4. **Highlight** — matching text is highlighted (yellow `<mark>`) in the rendered document

## Design

### Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                    searchStore                   │
│  index: Minisearch | isIndexing | progress        │
│  doSearch() → results with lineNumber, matchText │
│  highlightTarget → { docId, matchText }           │
├─────────────────────────────────────────────────┤
│  searchService.ts (replaces Fuse.js)              │
│  buildIndex(docs, readDocument) → Minisearch      │
│  searchIndex(query) → SearchResult[]              │
├─────────────────────────────────────────────────┤
│  SearchOverlay.vue                                │
│  shows snippet + line info → click triggers jump │
├─────────────────────────────────────────────────┤
│  MarkdownViewer.vue                               │
│  receives highlightTarget → scrollTo + <mark>    │
└─────────────────────────────────────────────────┘
```

### 1. Install Dependency

```bash
npm install minisearch
```

- [minisearch](https://github.com/lucaong/minisearch) ~40KB, zero deps
- Same library VitePress uses internally for search

### 2. Type Changes (`src/types/search.ts`)

```ts
export interface SearchResult {
  docId: string
  fileName: string
  snippet: string      // context around match text (was: path)
  score: number
  line: number         // exists but unused; now populated from content match
  matchText: string    // NEW: the exact matched text, for highlight
  terms: string[]      // NEW: matched terms from Minisearch
}
```

### 3. Search Service (`src/services/searchService.ts`)

Replace Fuse.js with Minisearch:

```ts
import MiniSearch from 'minisearch'

let miniSearch: MiniSearch | null = null
let indexedDocIds = new Set<string>()

// Build index from flat doc list. readDoc is a callback to get file content.
async function buildIndex(
  docs: DocMeta[],
  readDoc: (id: string) => Promise<string>,
  onProgress?: (current: number, total: number) => void
): Promise<void> { ... }

function searchIndex(query: string): SearchResult[] { ... }
function resetIndex(): void { ... }
```

**Key design decisions:**

- Index is built **once** when a folder is opened, then re-built when the folder changes
- Only leaf nodes (files, not directories) are indexed
- `readDoc` uses the existing `readDocument(id)` from tauriService → Rust backend
- Files > 1MB are skipped (configurable threshold)
- Indexing runs **asynchronously** after `doScanDirectory` completes; the file tree renders immediately
- `searchStore.isIndexing` + `searchStore.indexProgress` drive a small status indicator in the search overlay

**Minisearch configuration:**

```ts
new MiniSearch({
  idField: 'id',
  fields: ['name', 'content', 'path'],
  storeFields: ['name', 'path', 'content'],
  searchOptions: {
    boost: { name: 2 },       // filename matches rank higher
    prefix: true,              // search as you type
    fuzzy: 0.2,               // tolerate typos
  },
  extractField: (doc, fieldName) => {
    if (fieldName === 'content') {
      // Split content into lines for line-level matching
      return doc.content
    }
    return doc[fieldName]
  },
})
```

### 4. Search Store (`src/stores/searchStore.ts`)

Add:

```ts
const isIndexing = ref(false)
const indexProgress = ref({ current: 0, total: 0 })
const highlightTarget = ref<{ docId: string; matchText: string } | null>(null)

// On doScanDirectory complete, trigger index build:
async function doBuildIndex() {
  isIndexing.value = true
  const flatDocs = flattenDocs(documentStore.docTree)
  indexProgress.value = { current: 0, total: flatDocs.length }
  
  await buildIndex(flatDocs, readDocument, (cur, total) => {
    indexProgress.value = { current: cur, total }
  })
  
  isIndexing.value = false
}
```

### 5. Search Overlay (`SearchOverlay.vue`)

Modify `handleSelect` to store highlight target before opening:

```ts
function handleSelect(result: SearchResult) {
  searchStore.doAddToHistory(searchStore.query)
  
  // Set highlight target BEFORE loading the doc
  searchStore.highlightTarget = {
    docId: result.docId,
    matchText: result.matchText,
  }
  
  tabStore.doOpenTab(result.docId, result.fileName)
  documentStore.doLoadDocument(result.docId)
  searchStore.doCloseSearch()
}
```

Result item UI updated to show content snippet + approximate line:

```
┌──────────────────────────────────┐
│ 📄 getting-started.md            │
│    ...安装步骤请参考下面的命令... │ ← content snippet with match
│    Line 42  /path/to/file        │
└──────────────────────────────────┘
```

### 6. MarkdownViewer (`MarkdownViewer.vue`)

Watch for `highlightTarget` changes. When set and the current doc matches:

```ts
watch(() => searchStore.highlightTarget, async (target) => {
  if (!target || target.docId !== documentStore.currentDoc?.meta.id) return
  
  await nextTick()
  
  const container = document.querySelector('.markdown-content')
  if (!container) return
  
  // 1. Find and highlight matching text in DOM
  highlightText(container, target.matchText)
  
  // 2. Scroll the first <mark> into view
  const firstMark = container.querySelector('mark')
  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
})

function highlightText(container: HTMLElement, matchText: string) {
  // Walk text nodes, find matches, wrap in <mark style="background:#fde047;">
  // Only highlight in text content, skip code blocks and pre elements
}
```

**Highlight color:** yellow (`#fde047` / Tailwind `bg-yellow-200`) matching VSCode/VitePress convention.

**Dismiss highlight:** Clicking on the document or switching tabs clears `highlightTarget`.

### 7. Index Lifecycle

```
Open folder                → buildIndex (async, with progress)
Switch folder              → resetIndex() + buildIndex (async)
File added/modified on disk → user re-opens folder or manual refresh button
Search before index ready  → show "索引构建中 (15/42)..." in overlay
Search after index ready   → normal full-text search
```

No auto-watch on file changes (Tauri `watch` is complex). A simple "刷新" button in the sidebar can trigger re-scan + re-index.

### 8. Performance Considerations

| Concern | Mitigation |
|---|---|
| Reading all files upfront | Files read via Rust `read_document` (fast native I/O); progress indicator keeps UX responsive |
| Large files (>1MB) | Skip them; configurable `maxFileSize` in searchService |
| Re-indexing on every search | Index built once, queried many times; Minisearch query is ~1ms for hundreds of docs |
| Memory (storing all file contents) | For a typical 200-file folder averaging 10KB each = ~2MB, negligible |
| Chinese text search | Minisearch uses term-based matching; Chinese needs either whitespace-separated tokens or `fuzzy: 0` with `prefix: true`. Recommend using `minisearch` with `tokenize` for CJK. |

### 9. Files Changed

| File | Change |
|---|---|
| `package.json` | Add `minisearch` dependency |
| `src/types/search.ts` | Add `matchText`, `terms` fields |
| `src/services/searchService.ts` | Replace Fuse.js with Minisearch; add `buildIndex`, async file reading |
| `src/stores/searchStore.ts` | Add `isIndexing`, `indexProgress`, `highlightTarget`, `doBuildIndex` |
| `src/stores/documentStore.ts` | Call `searchStore.doBuildIndex()` after `doScanDirectory` |
| `src/components/search/SearchOverlay.vue` | Set `highlightTarget` on select; show indexing progress; show content snippet |
| `src/components/viewer/MarkdownViewer.vue` | Watch `highlightTarget`; scroll + highlight logic |
