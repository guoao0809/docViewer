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
              <div v-if="result.snippet" class="text-xs truncate pl-6" style="opacity: 0.7;" v-html="highlightSnippet(result.snippet, searchStore.query)" />
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
