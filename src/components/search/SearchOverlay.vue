<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useDocumentStore } from '@/stores/documentStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, FileText, CornerDownLeft, X, Clock, Loader2 } from 'lucide-vue-next'

const searchStore = useSearchStore()
const documentStore = useDocumentStore()
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

  // Find the doc in the tree and open it
  const doc = findDocById(result.docId, documentStore.docTree)
  if (doc) {
    documentStore.doOpenDoc(doc)
  }
  searchStore.doCloseSearch()
}

function findDocById(id: string, docs: typeof documentStore.docTree): typeof documentStore.docTree[number] | null {
  for (const doc of docs) {
    if (doc.id === id) return doc
    if (doc.children) {
      const found = findDocById(id, doc.children)
      if (found) return found
    }
  }
  return null
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightSnippet(snippet: string, query: string): string {
  const escaped = escapeHtml(snippet)
  if (!query) return escaped
  const terms = query
    .split(/\s+/)
    .filter(t => t.length > 0)
    .map(t => escapeHtml(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (terms.length === 0) return escaped
  const regex = new RegExp(`(${terms.join('|')})`, 'gi')
  return escaped.replace(regex, '<mark style="background:#fde047;color:#000;border-radius:2px;padding:0 1px;">$1</mark>')
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
        class="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl bg-surface border border-border"
        @click.stop
        @keydown="handleKeyDown"
      >
        <!-- Search input -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search class="w-5 h-5 text-text/40" />
          <input
            ref="inputRef"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-base text-text"
            placeholder="搜索文档内容..."
            @input="handleInput"
          />
          <button class="text-text/40 hover:text-text" @click="searchStore.doCloseSearch()">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Indexing progress -->
        <div
          v-if="searchStore.isIndexing"
          class="flex items-center gap-2 px-4 py-3 text-sm text-text/50"
        >
          <Loader2 class="w-3.5 h-3.5 animate-spin" />
          索引构建中 ({{ searchStore.indexProgress.current }}/{{ searchStore.indexProgress.total }})...
        </div>

        <!-- Search results -->
        <ScrollArea v-if="searchStore.results.length > 0" class="max-h-64">
          <div class="py-1">
            <div
              v-for="(result, index) in searchStore.results" :key="result.docId"
              class="flex flex-col gap-0.5 px-4 py-2.5 cursor-pointer rounded-md mx-1"
              :class="{
                'bg-active': index === selectedIndex,
                'hover:bg-hover': index !== selectedIndex,
              }"
              @click="handleSelect(result)"
              @mouseenter="selectedIndex = index"
            >
              <div class="flex items-center gap-2">
                <FileText class="w-4 h-4 shrink-0 text-text/50" />
                <span class="text-base truncate text-title">{{ result.fileName }}</span>
                <CornerDownLeft v-if="index === selectedIndex" class="w-3.5 h-3.5 text-text/30 shrink-0 ml-auto" />
              </div>
              <div v-if="result.snippet" class="text-sm truncate pl-6 text-text/70" v-html="highlightSnippet(result.snippet, searchStore.query)" />
              <div v-if="result.line > 0" class="text-xs text-text/30 pl-6">
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
          <span class="text-sm text-text/40">未找到匹配的文档</span>
        </div>

        <!-- Search history -->
        <div v-if="(!searchStore.query || searchStore.showHistory) && searchStore.searchHistory.length > 0" class="border-t border-border">
          <div class="flex items-center justify-between px-4 py-1.5">
            <span class="text-sm text-text/40">最近搜索</span>
            <button
              class="text-sm text-text/40 hover:text-text transition-colors"
              @click="searchStore.doClearHistory()"
            >
              清空历史
            </button>
          </div>
          <div
            v-for="(item, index) in searchStore.searchHistory.slice(0, 10)" :key="index"
            class="group flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-hover text-sm text-text rounded-md mx-1"
            @click="handleInput({ target: { value: item } } as any)"
          >
            <Clock class="w-3.5 h-3.5 text-text/40 shrink-0" />
            <span class="flex-1 truncate">{{ item }}</span>
            <button
              class="opacity-0 group-hover:opacity-100 text-text/40 hover:text-text transition-opacity"
              @click.stop="searchStore.doRemoveFromHistory(item)"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
