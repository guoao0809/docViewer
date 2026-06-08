<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, FileText, CornerDownLeft, X, Clock } from 'lucide-vue-next'

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

function handleSelect(docId: string) {
  searchStore.doAddToHistory(searchStore.query)
  tabStore.doOpenTab(docId, docId.split('/').pop() ?? docId)
  documentStore.doLoadDocument(docId)
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
      handleSelect(searchStore.results[selectedIndex.value].docId)
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
        <div class="flex items-center gap-2 px-4 py-3" style="border-bottom: 1px solid var(--border);">
          <Search class="w-5 h-5 opacity-40" style="color: var(--text);" />
          <input
            ref="inputRef"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-base"
            style="color: var(--text);"
            placeholder="搜索文档 (文件名)"
            @input="handleInput"
          />
          <button class="opacity-40 hover:opacity-100" @click="searchStore.doCloseSearch()">
            <X class="w-4 h-4" />
          </button>
        </div>

        <ScrollArea v-if="searchStore.results.length > 0" class="max-h-64">
          <div class="py-1">
            <div
              v-for="(result, index) in searchStore.results" :key="result.docId"
              class="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
              :style="{
                backgroundColor: index === selectedIndex ? 'var(--active-bg)' : 'transparent',
                color: 'var(--text)',
              }"
              @click="handleSelect(result.docId)"
              @mouseenter="selectedIndex = index"
            >
              <FileText class="w-4 h-4 shrink-0 opacity-50" />
              <div class="flex-1 min-w-0">
                <div class="text-sm truncate" style="color: var(--title);">{{ result.fileName }}</div>
                <div class="text-xs truncate opacity-50">{{ result.snippet }}</div>
              </div>
              <CornerDownLeft v-if="index === selectedIndex" class="w-3.5 h-3.5 opacity-30 shrink-0" />
            </div>
          </div>
        </ScrollArea>

        <div v-if="searchStore.query && !searchStore.isSearching && searchStore.results.length === 0" class="px-4 py-6 text-center">
          <span class="text-sm" style="color: var(--text); opacity: 0.4;">未找到匹配的文档</span>
        </div>

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
