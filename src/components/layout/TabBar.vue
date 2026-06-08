<script setup lang="ts">
import { useTabStore } from '@/stores/tabStore'
import { useDocumentStore } from '@/stores/documentStore'
import { X, Pin } from 'lucide-vue-next'

const tabStore = useTabStore()
const documentStore = useDocumentStore()

function handleTabClick(docId: string) {
  tabStore.doSetActiveTab(docId)
  documentStore.doLoadDocument(docId)
}

function handleTabClose(event: Event, docId: string) {
  event.stopPropagation()
  tabStore.doCloseTab(docId)
}

function handleTabPin(event: Event, docId: string) {
  event.stopPropagation()
  tabStore.doPinTab(docId)
}
</script>

<template>
  <div
    v-if="tabStore.tabs.length > 0"
    class="flex items-center overflow-x-auto shrink-0"
    style="background-color: var(--sidebar); border-bottom: 1px solid var(--border); height: 35px;"
  >
    <div
      v-for="tab in tabStore.tabOrder" :key="tab.docId"
      class="flex items-center gap-1.5 px-3 h-full cursor-pointer text-sm whitespace-nowrap group shrink-0"
      :style="{
        backgroundColor: tab.docId === tabStore.activeTabId ? 'var(--bg)' : 'transparent',
        color: tab.docId === tabStore.activeTabId ? 'var(--title)' : 'var(--text)',
        borderRight: '1px solid var(--border)',
      }"
      @click="handleTabClick(tab.docId)"
    >
      <Pin v-if="tab.pinned" class="w-3 h-3 opacity-50 shrink-0" style="color: var(--primary);" />
      <span class="truncate max-w-[160px]">{{ tab.title }}</span>
      <button
        class="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5"
        @click="handleTabClose($event, tab.docId)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>
