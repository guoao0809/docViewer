# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign DocViewer UI to three-column layout (navigation sidebar + document list + content viewer), remove TabBar/TocPanel, add opened-docs history.

**Architecture:** Three-column layout in MainLayout. Sidebar becomes a nav panel with folder tree. New DocumentList component shows opened-docs history in the middle. ContentViewer replaces MarkdownViewer inline usage. StatusBar shows aggregate stats.

**Tech Stack:** Vue 3 + TypeScript + Pinia + Tailwind CSS + lucide-vue-next

**Files to create:** `DocumentList.vue`, `ContentViewer.vue`
**Files to delete:** `TabBar.vue`, `TocPanel.vue`
**Files to modify:** `MainLayout.vue`, `Sidebar.vue`, `StatusBar.vue`, `App.vue`, `documentStore.ts`, `useKeyboard.ts`

---

### Task 1: Add openedDocs and activeDocId to documentStore

**Files:**
- Modify: `src/stores/documentStore.ts`
- Modify: `src/composables/useKeyboard.ts`

- [ ] **Step 1: Add openedDocs state and methods**

In `src/stores/documentStore.ts`, add these new state variables after `isLoading` (line ~43):

```ts
const openedDocs = ref<DocMeta[]>([])
const activeDocId = ref<string | null>(null)
```

Add these new functions alongside the existing `doLoadDocument`:

```ts
function doOpenDoc(doc: DocMeta) {
  // Add to openedDocs if not already there (put most recent first)
  if (!openedDocs.value.find(d => d.id === doc.id)) {
    openedDocs.value = [doc, ...openedDocs.value]
  }
  activeDocId.value = doc.id
  doLoadDocument(doc.id)
}

function doRemoveOpenedDoc(docId: string) {
  openedDocs.value = openedDocs.value.filter(d => d.id !== docId)
  if (activeDocId.value === docId) {
    const next = openedDocs.value[0]
    if (next) {
      activeDocId.value = next.id
      doLoadDocument(next.id)
    } else {
      activeDocId.value = null
      currentDoc.value = null
    }
  }
}

function getFolderTag(docId: string): string {
  for (const rootPath of rootPaths.value) {
    if (docId.startsWith(rootPath.replaceAll('\\', '/')) || docId.startsWith(rootPath)) {
      return rootPath.replaceAll('\\', '/').split('/').pop() || rootPath
    }
  }
  return ''
}
```

- [ ] **Step 2: Update persistState to include openedDocs**

In `persistState()`, add `openedDocs` and `activeDocId`:

```ts
function persistState() {
  const state = {
    rootPaths: rootPaths.value,
    expandedDirs: Array.from(expandedDirs.value),
    docMeta: serializeDocTree(docTree.value),
    openedDocs: openedDocs.value.map(d => d.id),
    activeDocId: activeDocId.value,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
```

- [ ] **Step 3: Update loadPersistedState to restore openedDocs**

In `loadPersistedState()`, add restore logic after the existing `expandedDirs` line:

```ts
if (state.openedDocs && state.activeDocId !== undefined) {
  // Restore activeDocId first, then we'll rebuild openedDocs after tree is loaded
  activeDocId.value = state.activeDocId as string | null
  // openedDocs will be restored after tree scan (see below)
}
```

- [ ] **Step 4: Add openedDocs restoration after scan**

At the end of `doScanDirectory`, after `searchStore.doBuildIndex()`, add:

```ts
// Restore opened docs references for this folder
if (activeDocId.value) {
  const doc = findDocById(activeDocId.value, [rootNode])
  if (doc && !openedDocs.value.find(d => d.id === doc.id)) {
    openedDocs.value = [doc, ...openedDocs.value]
  }
}
```

- [ ] **Step 5: Update the return statement**

Add `openedDocs`, `activeDocId`, `doOpenDoc`, `doRemoveOpenedDoc`, `getFolderTag` to the return object.

- [ ] **Step 6: Update useKeyboard.ts to use documentStore instead of tabStore**

In `src/composables/useKeyboard.ts`, replace tab-related shortcuts (`Ctrl+W`, `Ctrl+Tab`, `Ctrl+Shift+Tab`) with `openedDocs` equivalents:

```ts
// Ctrl+W: close current opened doc
if (isMod && event.key === 'w') {
  event.preventDefault()
  if (documentStore.activeDocId) {
    documentStore.doRemoveOpenedDoc(documentStore.activeDocId)
  }
  return
}

// Ctrl+Tab: next opened doc
if (isMod && event.key === 'Tab' && !event.shiftKey) {
  event.preventDefault()
  const docs = documentStore.openedDocs
  if (docs.length === 0) return
  const currentIndex = docs.findIndex(d => d.id === documentStore.activeDocId)
  const nextIndex = (currentIndex + 1) % docs.length
  documentStore.doOpenDoc(docs[nextIndex])
  return
}
```

Remove `import { useTabStore }` and `const tabStore = useTabStore()`.

- [ ] **Step 7: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/stores/documentStore.ts src/composables/useKeyboard.ts
git commit -m "feat: add openedDocs history and activeDocId to documentStore, update keyboard shortcuts"
```

---

### Task 2: Create DocumentList component

**Files:**
- Create: `src/components/layout/DocumentList.vue`

- [ ] **Step 1: Write the DocumentList component**

Create `src/components/layout/DocumentList.vue` with this exact content:

```vue
<script setup lang="ts">
import { useDocumentStore } from '@/stores/documentStore'
import { FileText, FileCode, Star, X } from 'lucide-vue-next'

const documentStore = useDocumentStore()

function getFileIcon(type: string) {
  return type === 'markdown' ? FileText : FileCode
}

function formatDate(ts: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function handleClick(doc: typeof documentStore.openedDocs[number]) {
  documentStore.doOpenDoc(doc)
}

function handleRemove(event: Event, docId: string) {
  event.stopPropagation()
  documentStore.doRemoveOpenedDoc(docId)
}

function handleToggleStar(event: Event, docId: string) {
  event.stopPropagation()
  documentStore.doToggleFavorite(docId)
}
</script>

<template>
  <aside
    class="flex flex-col overflow-hidden border-r"
    style="background-color: var(--sidebar); border-color: var(--border);"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 h-10 shrink-0"
      style="border-bottom: 1px solid var(--border);"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold" style="color: var(--title);">全部文档</span>
        <span class="text-xs rounded-full px-1.5 py-0.5" style="background-color: var(--panel); color: var(--text); opacity: 0.6;">
          共 {{ documentStore.openedDocs.length }} 个文档
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="documentStore.openedDocs.length === 0"
      class="flex-1 flex items-center justify-center p-4"
    >
      <span class="text-xs" style="color: var(--text); opacity: 0.3;">
        从左侧文件夹选择文档
      </span>
    </div>

    <!-- Document list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="doc in documentStore.openedDocs"
        :key="doc.id"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b group transition-colors"
        :style="{
          backgroundColor: doc.id === documentStore.activeDocId ? 'var(--active-bg)' : 'transparent',
          borderColor: 'var(--border)',
        }"
        @click="handleClick(doc)"
        @mouseenter="(($event.currentTarget) as HTMLElement).style.backgroundColor = doc.id === documentStore.activeDocId ? 'var(--active-bg)' : 'var(--hover-bg)'"
        @mouseleave="(($event.currentTarget) as HTMLElement).style.backgroundColor = doc.id === documentStore.activeDocId ? 'var(--active-bg)' : 'transparent'"
      >
        <!-- File icon -->
        <component :is="getFileIcon(doc.type)" class="w-5 h-5 shrink-0" style="opacity: 0.5;" />

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate" style="color: var(--title);">{{ doc.name }}</div>
          <div class="flex items-center gap-2 text-xs" style="color: var(--text); opacity: 0.5;">
            <span v-if="doc.lastOpen">{{ formatDate(doc.lastOpen) }}</span>
            <span>{{ formatSize(doc.size) }}</span>
            <span class="px-1.5 py-0.5 rounded text-xs" style="background-color: var(--panel); opacity: 0.8;">
              {{ documentStore.getFolderTag(doc.id) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          :style="{ color: doc.favorite ? '#e8a44a' : 'var(--text)', opacity: doc.favorite ? 1 : 0.3 }"
          @click="handleToggleStar($event, doc.id)"
          title="收藏"
        >
          <Star class="w-4 h-4" :class="doc.favorite ? 'fill-current' : ''" />
        </button>

        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
          @click="handleRemove($event, doc.id)"
          title="移除"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors (may need `--noEmit` or `--skipLibCheck`).

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/DocumentList.vue
git commit -m "feat: create DocumentList component for opened-docs history"
```

---

### Task 3: Create ContentViewer component

**Files:**
- Create: `src/components/viewer/ContentViewer.vue`

- [ ] **Step 1: Write the ContentViewer component**

Create `src/components/viewer/ContentViewer.vue`:

```vue
<script setup lang="ts">
import { watch, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog } from '@/services/tauriService'
import { FileText, Edit3, Copy, MoreHorizontal } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

/** Walk text nodes and highlight matching terms */
function highlightText(container: HTMLElement, matchText: string) {
  const terms = matchText.split(/\s+/).filter(t => t.length > 1).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (terms.length === 0) return
  const regex = new RegExp(`(${terms.join('|')})`, 'gi')
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest('pre, code, mark')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  for (const node of textNodes) {
    const text = node.textContent ?? ''
    if (!regex.test(text)) continue
    regex.lastIndex = 0
    const frag = document.createDocumentFragment()
    let lastIdx = 0; let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      const mark = document.createElement('mark')
      mark.style.cssText = 'background-color: #fde047; color: #000; border-radius: 2px; padding: 0 1px;'
      mark.textContent = match[0]
      frag.appendChild(mark)
      lastIdx = regex.lastIndex
    }
    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)))
    node.parentNode?.replaceChild(frag, node)
  }
}

function clearHighlights(container: HTMLElement) {
  container.querySelectorAll('mark').forEach(mark => {
    mark.parentNode?.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
    mark.parentNode?.normalize()
  })
}

function scrollToFirstMatch() {
  const firstMark = document.querySelector('.markdown-content mark')
  if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(() => searchStore.highlightTarget, async (target) => {
  if (!target || target.docId !== documentStore.currentDoc?.meta.id) return
  await nextTick()
  const container = document.querySelector('.markdown-content') as HTMLElement | null
  if (!container) return
  clearHighlights(container)
  highlightText(container, target.matchText)
  scrollToFirstMatch()
})

function handleContentClick() {
  searchStore.doClearHighlight()
}
</script>

<template>
  <!-- Empty state -->
  <div v-if="!documentStore.currentDoc" class="h-full flex flex-col items-center justify-center" style="background-color: var(--bg);">
    <FileText class="w-16 h-16 mb-4" style="color: var(--text); opacity: 0.1;" />
    <p class="text-lg mb-2" style="color: var(--title); opacity: 0.5;">打开一个文档</p>
    <p class="text-sm mb-5" style="color: var(--text); opacity: 0.3;">从左侧文件夹或中间文档列表选择</p>
    <button class="flex items-center gap-2 px-4 py-2 rounded text-sm text-white transition-colors" style="background-color: var(--primary);" @click="handleOpenFolder">
      选择文件夹
    </button>
  </div>

  <!-- Content -->
  <div v-else class="h-full flex flex-col" style="background-color: var(--bg);">
    <!-- Title bar -->
    <div class="flex items-center gap-3 px-6 h-12 shrink-0" style="border-bottom: 1px solid var(--border);">
      <span class="text-base font-semibold truncate flex-1" style="color: var(--title);">
        {{ documentStore.currentDoc.meta.name }}
      </span>
      <button class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors" title="编辑">
        <Edit3 class="w-4 h-4" style="opacity: 0.5;" />
      </button>
      <button class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors" title="复制">
        <Copy class="w-4 h-4" style="opacity: 0.5;" />
      </button>
      <button class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors" title="更多">
        <MoreHorizontal class="w-4 h-4" style="opacity: 0.5;" />
      </button>
    </div>

    <!-- Content scroll -->
    <div class="flex-1 overflow-y-auto" @click="handleContentClick">
      <div class="markdown-content" v-html="documentStore.currentDoc.html" />
    </div>
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
git add src/components/viewer/ContentViewer.vue
git commit -m "feat: create ContentViewer component with search highlight support"
```

---

### Task 4: Rewrite Sidebar as navigation panel

**Files:**
- Modify: `src/components/layout/Sidebar.vue`

- [ ] **Step 1: Rewrite Sidebar**

Replace the entire contents of `src/components/layout/Sidebar.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import DocTree from '@/components/sidebar/DocTree.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderPlus, Clock, Star, FileText, Search, Settings, ChevronDown, ChevronRight } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

const navItems = [
  { key: 'recent',   icon: Clock,     label: '最近打开' },
  { key: 'favorites',icon: Star,      label: '收藏夹' },
  { key: 'all',      icon: FileText,  label: '全部文档' },
  { key: 'history',  icon: Search,    label: '搜索历史' },
]

const activeNav = computed(() => 'all')

async function handleAddFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleNavClick(key: string) {
  // TODO: filter document list by category
}

function handleSearchHistory() {
  searchStore.doOpenSearch()
}
</script>

<template>
  <aside class="flex flex-col overflow-hidden select-none" style="background-color: var(--sidebar);">
    <!-- Add document button -->
    <div class="px-3 py-3 shrink-0">
      <button
        class="flex items-center justify-center gap-2 w-full py-2 rounded text-sm font-medium transition-colors"
        style="background-color: var(--primary); color: #fff;"
        @click="handleAddFolder"
      >
        <FolderPlus class="w-4 h-4" />
        添加文档
      </button>
    </div>

    <!-- Navigation menu -->
    <div class="px-2 shrink-0">
      <div
        v-for="item in navItems"
        :key="item.key"
        class="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm transition-colors"
        :style="{
          backgroundColor: activeNav === item.key ? 'var(--active-bg)' : 'transparent',
          color: activeNav === item.key ? 'var(--title)' : 'var(--text)',
        }"
        @click="item.key === 'history' ? handleSearchHistory() : handleNavClick(item.key)"
        @mouseenter="(($event.currentTarget) as HTMLElement).style.backgroundColor = activeNav === item.key ? 'var(--active-bg)' : 'var(--hover-bg)'"
        @mouseleave="(($event.currentTarget) as HTMLElement).style.backgroundColor = activeNav === item.key ? 'var(--active-bg)' : 'transparent'"
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0" style="opacity: 0.6;" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 my-2" style="border-top: 1px solid var(--border);" />

    <!-- Project folders section -->
    <div class="flex items-center justify-between px-4 h-7 shrink-0 text-xs font-semibold uppercase tracking-wider" style="color: var(--text); opacity: 0.6;">
      <span>项目</span>
      <button class="h-5 w-5 flex items-center justify-center rounded hover:bg-white/5" @click="handleAddFolder" title="添加文件夹">
        <FolderPlus class="w-3 h-3" />
      </button>
    </div>

    <!-- Folder tree -->
    <div class="flex-1 overflow-y-auto">
      <DocTree />
    </div>

    <!-- Settings at bottom -->
    <div style="border-top: 1px solid var(--border);">
      <div
        class="flex items-center gap-2 px-4 py-2 cursor-pointer text-sm transition-colors"
        style="color: var(--text); opacity: 0.6;"
        @mouseenter="(($event.currentTarget) as HTMLElement).style.backgroundColor = 'var(--hover-bg)'"
        @mouseleave="(($event.currentTarget) as HTMLElement).style.backgroundColor = 'transparent'"
      >
        <Settings class="w-4 h-4 shrink-0" />
        <span>设置</span>
      </div>
    </div>
  </aside>
</template>
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.vue
git commit -m "feat: rewrite Sidebar as navigation panel with folder tree"
```

---

### Task 5: Rewrite MainLayout with three-column layout

**Files:**
- Modify: `src/layouts/MainLayout.vue`

- [ ] **Step 1: Rewrite MainLayout**

Replace the entire contents of `src/layouts/MainLayout.vue`:

```vue
<script setup lang="ts">
import { useSettingStore } from '@/stores/settingStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import DocumentList from '@/components/layout/DocumentList.vue'
import StatusBar from '@/components/layout/StatusBar.vue'

const settingStore = useSettingStore()
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden" style="background-color: var(--bg);">
    <!-- Top header bar -->
    <AppHeader />

    <!-- Three-column body -->
    <div class="flex flex-1 overflow-hidden" style="border-top: 1px solid var(--border);">
      <!-- Left: Navigation sidebar -->
      <Sidebar
        v-show="!settingStore.sidebarCollapsed"
        class="shrink-0 overflow-hidden"
        :style="{ width: settingStore.sidebarWidth + 'px' }"
      />

      <!-- Middle: Document list -->
      <DocumentList class="shrink-0 overflow-hidden" style="width: 320px;" />

      <!-- Right: Content viewer -->
      <main class="flex-1 min-w-0 overflow-hidden">
        <slot />
      </main>
    </div>

    <!-- Bottom status bar -->
    <StatusBar />
  </div>
</template>
```

- [ ] **Step 2: Remove unused imports**

Remove `TabBar`, `TocPanel` imports and related computed properties (sidebarW, tocW, gridCols) — no longer needed.

- [ ] **Step 3: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/MainLayout.vue
git commit -m "feat: rewrite MainLayout with three-column layout"
```

---

### Task 6: Update StatusBar with aggregate stats

**Files:**
- Modify: `src/components/layout/StatusBar.vue`

- [ ] **Step 1: Rewrite StatusBar**

Replace the contents of `src/components/layout/StatusBar.vue`:

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'

const documentStore = useDocumentStore()

const stats = computed(() => {
  const doc = documentStore.currentDoc
  if (!doc) return null
  const wordCount = doc.raw.split(/\s+/).filter(w => w.length > 0).length
  const lineCount = doc.raw.split('\n').length
  const size = doc.meta.size > 1024 * 1024
    ? `${(doc.meta.size / (1024 * 1024)).toFixed(1)} MB`
    : doc.meta.size > 1024
    ? `${(doc.meta.size / 1024).toFixed(1)} KB`
    : `${doc.meta.size} B`
  const modified = doc.meta.modified
    ? new Date(doc.meta.modified).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '未知'
  return {
    totalDocs: documentStore.openedDocs.length,
    wordCount,
    lineCount,
    size,
    modified,
  }
})
</script>

<template>
  <footer
    class="flex items-center justify-between h-6 px-3 text-xs select-none shrink-0"
    style="background-color: var(--primary); color: #fff; opacity: 0.9;"
  >
    <span>总计: {{ stats?.totalDocs ?? 0 }} 个文档</span>
    <span v-if="stats">
      字数: {{ stats.wordCount }} | 行数: {{ stats.lineCount }} | 大小: {{ stats.size }} | 修改时间: {{ stats.modified }}
    </span>
  </footer>
</template>
```

- [ ] **Step 2: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/StatusBar.vue
git commit -m "feat: update StatusBar with aggregate document stats"
```

---

### Task 7: Update App.vue and delete old components

**Files:**
- Modify: `src/App.vue`
- Delete: `src/components/layout/TabBar.vue`
- Delete: `src/components/viewer/TocPanel.vue`

- [ ] **Step 1: Update App.vue**

Replace the contents of `src/App.vue`:

```vue
<script setup lang="ts">
import { useKeyboard } from '@/composables/useKeyboard'
import MainLayout from '@/layouts/MainLayout.vue'
import SearchOverlay from '@/components/search/SearchOverlay.vue'
import ContentViewer from '@/components/viewer/ContentViewer.vue'

useKeyboard()
</script>

<template>
  <MainLayout>
    <ContentViewer />
  </MainLayout>
  <SearchOverlay />
</template>
```

- [ ] **Step 2: Delete TabBar.vue**

```bash
rm src/components/layout/TabBar.vue
```

- [ ] **Step 3: Delete TocPanel.vue**

```bash
rm src/components/viewer/TocPanel.vue
```

- [ ] **Step 4: Verify type-check**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npx vue-tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git rm src/components/layout/TabBar.vue src/components/viewer/TocPanel.vue
git commit -m "feat: wire up new UI — remove TabBar/TocPanel, use ContentViewer"
```

---

### Task 8: End-to-End Verification

- [ ] **Step 1: Run a full build**

```bash
cd c:/Users/70920/Desktop/doc/DocViewer/docviewer && npm run build
```

Expected: `vue-tsc` + `vite build` pass.

- [ ] **Step 2: Run Tauri dev and smoke test**

```bash
npm run tauri dev
```

Manual checklist:
1. App launches with empty state (no folders)
2. Click "添加文档" → select a folder → folder tree appears in left sidebar
3. Click a file in the tree → file appears in middle document list + content displays in right panel
4. Click another file → added to document list, content switches
5. Star toggle on document list item works
6. Remove (X) button on document list item works
7. Ctrl+K opens search overlay
8. Search result click → jumps to match with highlight
9. Click another file through search → added to document list
10. Status bar shows correct stats for current document
11. Add a second folder → both appear in sidebar tree

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A && git commit -m "chore: final fixes for UI redesign"
```
