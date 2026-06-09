# Full-Text Search with Minisearch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Fuse.js with Minisearch for full-text content search, with search result snippets and jump-to-match + highlight.

**Architecture:** `searchService.ts` builds a Minisearch index from all file contents after folder scan. `searchStore.ts` manages index state, progress, and highlight targets. `SearchOverlay.vue` shows content snippets and sets jump targets. `MarkdownViewer.vue` scrolls to and highlights matching text.

**Tech Stack:** Minisearch (v6+), Vue 3 reactivity, Tauri v2 plugin-fs (readTextFile), Pinia stores

**Files to modify:**
- `src/types/search.ts` — add `matchText` fields
- `src/services/searchService.ts` — full rewrite
- `src/stores/searchStore.ts` — add index/highlight state
- `src/stores/documentStore.ts` — trigger index after scan
- `src/components/search/SearchOverlay.vue` — snippet display, highlight target
- `src/components/viewer/MarkdownViewer.vue` — scroll + highlight

---

### Task 1: Install Minisearch

- [ ] **Step 1: Install the package**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npm install minisearch
```

Expected: `minisearch` added to `package.json` dependencies.

---

### Task 2: Update search types

**Files:**
- Modify: `src/types/search.ts`

- [ ] **Step 1: Add new fields to SearchResult**

Read `src/types/search.ts` and replace its contents:

```ts
export interface SearchResult {
  docId: string
  fileName: string
  snippet: string
  score: number
  line: number
  matchText: string
  terms: string[]
}
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/search.ts
git commit -m "feat: add matchText and terms fields to SearchResult type"
```

---

### Task 3: Rewrite searchService.ts with Minisearch

**Files:**
- Modify: `src/services/searchService.ts`

- [ ] **Step 1: Write the new searchService**

Replace the entire contents of `src/services/searchService.ts`:

```ts
import MiniSearch from 'minisearch'
import type { DocMeta } from '@/types/document'
import type { SearchResult } from '@/types/search'

interface IndexDoc {
  id: string
  name: string
  path: string
  content: string
}

const MAX_FILE_SIZE = 1_000_000 // 1MB: skip files larger than this

let miniSearch: MiniSearch<IndexDoc> | null = null
let indexedDocIds: Set<string> | null = null

function flattenDocs(docs: DocMeta[]): DocMeta[] {
  const result: DocMeta[] = []
  for (const doc of docs) {
    if (!doc.children) result.push(doc)
    if (doc.children) result.push(...flattenDocs(doc.children))
  }
  return result
}

export function getIndexedDocIds(): Set<string> | null {
  return indexedDocIds
}

export async function buildIndex(
  docs: DocMeta[],
  readDoc: (id: string) => Promise<string>,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const leaves = flattenDocs(docs)
  const total = leaves.length
  const indexDocs: IndexDoc[] = []

  for (let i = 0; i < leaves.length; i++) {
    const doc = leaves[i]
    onProgress?.(i + 1, total)
    try {
      const content = await readDoc(doc.id)
      if (content.length <= MAX_FILE_SIZE) {
        indexDocs.push({
          id: doc.id,
          name: doc.name,
          path: doc.path,
          content,
        })
      }
    } catch {
      // Skip unreadable files
    }
  }

  miniSearch = new MiniSearch<IndexDoc>({
    idField: 'id',
    fields: ['name', 'content', 'path'],
    storeFields: ['name', 'path', 'content'],
    searchOptions: {
      boost: { name: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  })

  miniSearch.addAll(indexDocs)
  indexedDocIds = new Set(indexDocs.map(d => d.id))
}

export function searchIndex(query: string): SearchResult[] {
  if (!miniSearch || !query.trim()) return []

  const raw = miniSearch.search(query.trim(), { prefix: true, fuzzy: 0.2 })

  return raw.slice(0, 20).map(r => {
    const stored = miniSearch!.getStoredFields(r.id)
    const snippet = extractSnippet(stored?.content ?? '', query.trim())

    let line = 0
    if (stored?.content && r.terms && r.terms.length > 0) {
      const firstTerm = r.terms[0]
      const idx = stored.content.toLowerCase().indexOf(firstTerm.toLowerCase())
      if (idx >= 0) {
        line = stored.content.slice(0, idx).split('\n').length
      }
    }

    return {
      docId: r.id,
      fileName: stored?.name ?? r.id.split('/').pop() ?? r.id,
      snippet,
      score: r.score,
      line,
      matchText: r.terms ? r.terms.slice(0, 5).join(' ') : query.trim(),
      terms: r.terms ?? [query.trim()],
    }
  })
}

function extractSnippet(content: string, query: string, contextLen = 60): string {
  if (!content) return ''
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerContent.indexOf(lowerQuery)

  if (idx < 0) {
    // Try each query term
    for (const term of lowerQuery.split(/\s+/)) {
      const termIdx = lowerContent.indexOf(term)
      if (termIdx >= 0) {
        const start = Math.max(0, termIdx - contextLen)
        const end = Math.min(content.length, termIdx + term.length + contextLen)
        return (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '')
      }
    }
    return content.slice(0, contextLen * 2).replace(/\n/g, ' ') + '...'
  }

  const start = Math.max(0, idx - contextLen)
  const end = Math.min(content.length, idx + query.length + contextLen)
  return (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '')
}

export function isIndexReady(): boolean {
  return miniSearch !== null
}

export function resetIndex(): void {
  miniSearch = null
  indexedDocIds = null
}
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: Might show an error if `MiniSearch` types need `@types/minisearch`. If so, `minisearch` v6+ ships its own types, no extra install needed. If error, add `skipLibCheck: true` to tsconfig or fix import.

- [ ] **Step 3: Commit**

```bash
git add src/services/searchService.ts
git commit -m "feat: rewrite searchService with Minisearch full-text indexing"
```

---

### Task 4: Update searchStore.ts

**Files:**
- Modify: `src/stores/searchStore.ts`

- [ ] **Step 1: Rewrite searchStore**

Replace the entire contents of `src/stores/searchStore.ts`:

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchResult } from '@/types/search'
import { searchIndex, buildIndex, resetIndex, isIndexReady } from '@/services/searchService'
import { readDocument } from '@/services/tauriService'
import { useDocumentStore } from './documentStore'
import type { DocMeta } from '@/types/document'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const searchHistory = ref<string[]>(getSearchHistory())
  const isOpen = ref(false)
  const isIndexing = ref(false)
  const indexProgress = ref({ current: 0, total: 0 })
  const highlightTarget = ref<{ docId: string; matchText: string } | null>(null)

  function flattenDocs(docs: DocMeta[]): DocMeta[] {
    const result: DocMeta[] = []
    for (const doc of docs) {
      if (!doc.children) result.push(doc)
      if (doc.children) result.push(...flattenDocs(doc.children))
    }
    return result
  }

  async function doBuildIndex() {
    const docStore = useDocumentStore()
    const leaves = flattenDocs(docStore.docTree)
    if (leaves.length === 0) return

    isIndexing.value = true
    indexProgress.value = { current: 0, total: leaves.length }

    try {
      await buildIndex(docStore.docTree, readDocument, (current, total) => {
        indexProgress.value = { current, total }
      })
    } finally {
      isIndexing.value = false
    }
  }

  function doSearch(q: string) {
    query.value = q
    if (!q.trim()) { results.value = []; isSearching.value = false; return }

    if (!isIndexReady()) {
      results.value = []
      return
    }

    isSearching.value = true
    results.value = searchIndex(q)
    isSearching.value = false
  }

  function doAddToHistory(q: string) {
    addSearchHistory(q)
    searchHistory.value = getSearchHistory()
  }

  function doOpenSearch() { isOpen.value = true; query.value = ''; results.value = [] }
  function doCloseSearch() { isOpen.value = false; query.value = ''; results.value = [] }
  function doClearHighlight() { highlightTarget.value = null }

  return {
    query, results, isSearching, searchHistory, isOpen,
    isIndexing, indexProgress, highlightTarget,
    doSearch, doAddToHistory, doOpenSearch, doCloseSearch,
    doBuildIndex, doClearHighlight,
  }
})

function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem('docviewer-search-history')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addSearchHistory(q: string): void {
  if (!q.trim()) return
  const history = getSearchHistory()
  const filtered = history.filter(h => h !== q)
  filtered.unshift(q)
  localStorage.setItem('docviewer-search-history', JSON.stringify(filtered.slice(0, 20)))
}
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/searchStore.ts
git commit -m "feat: add index building, progress, and highlight target to searchStore"
```

---

### Task 5: Trigger index build in documentStore after scan

**Files:**
- Modify: `src/stores/documentStore.ts`

- [ ] **Step 1: Import searchStore and trigger build after scan**

In `src/stores/documentStore.ts`, add the import at line 6:

```ts
import { useSearchStore } from './searchStore'
```

Then modify the `doScanDirectory` function (around line 80-93) to trigger index build after the scan completes:

```ts
  async function doScanDirectory(path: string) {
    isLoading.value = true
    rootPath.value = path
    try {
      const tree = await scanDirectory(path)
      // Merge persisted favorite/lastOpen/visitCount data into new tree
      const persisted = getPersistedDocMetaMap()
      mergePersistedIntoTree(tree, persisted)
      docTree.value = tree
      persistState()
      // Trigger full-text index build (fire-and-forget, don't await)
      const searchStore = useSearchStore()
      searchStore.doBuildIndex()
    } finally {
      isLoading.value = false
    }
  }
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/documentStore.ts
git commit -m "feat: trigger search index build after directory scan"
```

---

### Task 6: Update SearchOverlay.vue

**Files:**
- Modify: `src/components/search/SearchOverlay.vue`

- [ ] **Step 1: Rewrite SearchOverlay with snippet display, progress, and highlight target**

Replace the entire contents of `src/components/search/SearchOverlay.vue`:

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, FileText, CornerDownLeft, X, Clock, Loader2 } from 'lucide-vue-next'

const searchStore = useSearchStore()
const documentStore = useDocumentStore()
const tabStore = useTabStore()
const inputRef = ref<HTMLInputElement | null>(null)
const selectedIndex = ref(0)

watch(() => searchStore.isOpen, async (open) => {
  if (open) {
    selectedIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

function handleInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  searchStore.doSearch(value)
  selectedIndex.value = 0
}

function handleSelect(result: typeof searchStore.results[number]) {
  searchStore.doAddToHistory(searchStore.query)

  // Store highlight target before loading the doc
  searchStore.highlightTarget = {
    docId: result.docId,
    matchText: result.matchText,
  }

  tabStore.doOpenTab(result.docId, result.fileName)
  documentStore.doLoadDocument(result.docId)
  searchStore.doCloseSearch()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, searchStore.results.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (searchStore.results[selectedIndex.value]) {
      handleSelect(searchStore.results[selectedIndex.value])
    }
  } else if (event.key === 'Escape') {
    searchStore.doCloseSearch()
  }
}

function handleOverlayClick(event: MouseEvent) {
  if ((event.target as HTMLElement).dataset.overlay === 'true') {
    searchStore.doCloseSearch()
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="searchStore.isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      data-overlay="true"
      style="background-color: rgba(0,0,0,0.5);"
      @click="handleOverlayClick"
    >
      <div
        class="w-full max-w-xl rounded-lg overflow-hidden shadow-2xl"
        style="background-color: var(--panel); border: 1px solid var(--border);"
        @click.stop
        @keydown="handleKeyDown"
      >
        <!-- Search input -->
        <div class="flex items-center gap-2 px-4 py-3" style="border-bottom: 1px solid var(--border);">
          <Search class="w-5 h-5 opacity-40" style="color: var(--text);" />
          <input
            ref="inputRef"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-base"
            style="color: var(--text);"
            placeholder="搜索文档内容..."
            @input="handleInput"
          />
          <button class="opacity-40 hover:opacity-100" @click="searchStore.doCloseSearch()">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Indexing progress -->
        <div
          v-if="searchStore.isIndexing"
          class="flex items-center gap-2 px-4 py-3 text-xs"
          style="color: var(--text); opacity: 0.5;"
        >
          <Loader2 class="w-3.5 h-3.5 animate-spin" />
          索引构建中 ({{ searchStore.indexProgress.current }}/{{ searchStore.indexProgress.total }})...
        </div>

        <!-- Search results -->
        <ScrollArea v-if="searchStore.results.length > 0" class="max-h-64">
          <div class="py-1">
            <div
              v-for="(result, index) in searchStore.results" :key="result.docId"
              class="flex flex-col gap-0.5 px-4 py-2.5 cursor-pointer"
              :style="{
                backgroundColor: index === selectedIndex ? 'var(--active-bg)' : 'transparent',
                color: 'var(--text)',
              }"
              @click="handleSelect(result)"
              @mouseenter="selectedIndex = index"
            >
              <div class="flex items-center gap-2">
                <FileText class="w-4 h-4 shrink-0 opacity-50" />
                <span class="text-sm truncate" style="color: var(--title);">{{ result.fileName }}</span>
                <CornerDownLeft v-if="index === selectedIndex" class="w-3.5 h-3.5 opacity-30 shrink-0 ml-auto" />
              </div>
              <div v-if="result.snippet" class="text-xs truncate opacity-50 pl-6">
                {{ result.snippet }}
              </div>
              <div v-if="result.line > 0" class="text-xs opacity-30 pl-6">
                Line {{ result.line }}
              </div>
            </div>
          </div>
        </ScrollArea>

        <!-- No results -->
        <div
          v-if="searchStore.query && !searchStore.isSearching && !searchStore.isIndexing && searchStore.results.length === 0"
          class="px-4 py-6 text-center"
        >
          <span class="text-sm" style="color: var(--text); opacity: 0.4;">未找到匹配的文档</span>
        </div>

        <!-- Search history -->
        <div v-if="!searchStore.query && searchStore.searchHistory.length > 0" style="border-top: 1px solid var(--border);">
          <div class="px-4 py-1.5 text-xs" style="color: var(--text); opacity: 0.4;">最近搜索</div>
          <div
            v-for="(item, index) in searchStore.searchHistory.slice(0, 5)" :key="index"
            class="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:opacity-80 text-sm"
            style="color: var(--text);"
            @click="handleInput({ target: { value: item } } as any)"
          >
            <Clock class="w-3.5 h-3.5 opacity-40" />
            {{ item }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/search/SearchOverlay.vue
git commit -m "feat: show content snippets, indexing progress, and set highlight target in search overlay"
```

---

### Task 7: Update MarkdownViewer.vue with scroll-to-match and highlight

**Files:**
- Modify: `src/components/viewer/MarkdownViewer.vue`

- [ ] **Step 1: Rewrite MarkdownViewer with highlight logic**

Replace the entire contents of `src/components/viewer/MarkdownViewer.vue`:

```vue
<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import { useSearchStore } from '@/stores/searchStore'
import { FileText } from 'lucide-vue-next'
import { openFileDialog } from '@/services/tauriService'

const documentStore = useDocumentStore()
const tabStore = useTabStore()
const searchStore = useSearchStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

/** Walk text nodes in a DOM subtree, find and highlight matching text */
function highlightText(container: HTMLElement, matchText: string) {
  // Split matchText into individual terms
  const terms = matchText
    .split(/\s+/)
    .filter(t => t.length > 1)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escape regex

  if (terms.length === 0) return

  const regex = new RegExp(`(${terms.join('|')})`, 'gi')

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip nodes inside code blocks, pre elements, and existing marks
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        if (parent.closest('pre, code, mark')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  const textNodes: Text[] = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }

  for (const node of textNodes) {
    const text = node.textContent ?? ''
    if (!regex.test(text)) continue
    regex.lastIndex = 0 // reset after test

    const frag = document.createDocumentFragment()
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      }
      const mark = document.createElement('mark')
      mark.style.cssText = 'background-color: #fde047; color: #000; border-radius: 2px; padding: 0 1px;'
      mark.textContent = match[0]
      frag.appendChild(mark)
      lastIdx = regex.lastIndex
    }

    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)))
    }

    node.parentNode?.replaceChild(frag, node)
  }
}

/** Scroll the first <mark> element into view */
function scrollToFirstMatch() {
  const firstMark = document.querySelector('.markdown-content mark')
  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

/** Remove all <mark> elements, restoring plain text */
function clearHighlights(container: HTMLElement) {
  const marks = container.querySelectorAll('mark')
  marks.forEach(mark => {
    const parent = mark.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
      parent.normalize() // merge adjacent text nodes
    }
  })
}

// Watch for highlight target changes
watch(() => searchStore.highlightTarget, async (target) => {
  if (!target) return
  if (target.docId !== documentStore.currentDoc?.meta.id) return

  await nextTick()

  const container = document.querySelector('.markdown-content') as HTMLElement | null
  if (!container) return

  // Clear any existing highlights first
  clearHighlights(container)

  // Highlight and scroll
  highlightText(container, target.matchText)
  scrollToFirstMatch()
})

// Clear highlights when user clicks on the document
function handleContentClick() {
  searchStore.doClearHighlight()
}
</script>

<template>
  <!-- Empty state: no document loaded -->
  <div v-if="!documentStore.currentDoc" class="h-full flex flex-col items-center justify-center" style="background-color: var(--bg);">
    <FileText class="w-16 h-16 mb-4" style="color: var(--text); opacity: 0.15;" />
    <p class="text-lg mb-2" style="color: var(--title); opacity: 0.6;">打开一个 Markdown 文档</p>
    <p class="text-sm mb-5" style="color: var(--text); opacity: 0.3;">从左侧目录选择文件，或使用 Ctrl+K 搜索</p>
    <button
      class="flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors"
      style="background-color: var(--primary); color: #fff;"
      @click="handleOpenFolder"
    >
      打开文件夹
    </button>
  </div>

  <!-- Document content -->
  <div
    v-else
    class="h-full overflow-y-auto"
    style="background-color: var(--bg);"
    @click="handleContentClick"
  >
    <div class="markdown-content" v-html="documentStore.currentDoc.html" />
  </div>
</template>
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/viewer/MarkdownViewer.vue
git commit -m "feat: add scroll-to-match and highlight for search results"
```

---

### Task 8: End-to-End Verification

- [ ] **Step 1: Run a full build**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npm run build
```

Expected: `vue-tsc --noEmit` passes, `vite build` completes without errors.

- [ ] **Step 2: Run Tauri dev and smoke test**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npm run tauri dev
```

Manual test checklist:

1. Open a folder containing `.md` / `.txt` files
2. Wait for indexing to complete (progress shown in search overlay)
3. Press `Ctrl+K` and search for a word that exists in file **content** (not filename)
4. Verify results show content snippets with `...` context
5. Click a result → document opens and **scrolls to** the matching text
6. Verify matched text is **highlighted** in yellow
7. Click on document body → highlights disappear
8. Search for something that doesn't exist → "未找到匹配的文档"

- [ ] **Step 3: Commit any final fixes**

If any issues found and fixed, commit them.

```bash
git add -A
git commit -m "chore: final adjustments for full-text search"
```
