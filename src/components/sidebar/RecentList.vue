<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import type { DocMeta } from '@/types/document'
import { FileText, Clock, ChevronDown, ChevronRight } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const collapsed = ref(false)

function getAllDocs(docs: DocMeta[]): DocMeta[] {
  const result: DocMeta[] = []
  for (const doc of docs) {
    if (!doc.children) result.push(doc)
    if (doc.children) result.push(...getAllDocs(doc.children))
  }
  return result
}

const recentDocs = computed(() =>
  getAllDocs(documentStore.docTree)
    .filter(d => d.lastOpen !== null)
    .sort((a, b) => (b.lastOpen ?? 0) - (a.lastOpen ?? 0))
    .slice(0, 10)
)

function openDoc(doc: DocMeta) {
  documentStore.doOpenDoc(doc)
}
</script>

<template>
  <div v-if="recentDocs.length > 0" style="border-bottom: 1px solid var(--border);">
    <div
      class="flex items-center gap-1 px-4 h-7 cursor-pointer text-xs font-semibold uppercase tracking-wider"
      style="color: var(--text); opacity: 0.7;"
      @click="collapsed = !collapsed"
    >
      <ChevronDown v-if="!collapsed" class="w-3.5 h-3.5 shrink-0" />
      <ChevronRight v-else class="w-3.5 h-3.5 shrink-0" />
      <Clock class="w-3 h-3 shrink-0" style="opacity: 0.6;" />
      <span>Recent</span>
    </div>
    <div v-show="!collapsed">
      <div
        v-for="doc in recentDocs" :key="doc.id"
        class="flex items-center gap-2 px-4 cursor-pointer text-sm transition-colors"
        style="color: var(--text); line-height: 22px;"
        @click="openDoc(doc)"
        @mouseenter="(($event.currentTarget) as HTMLElement).style.backgroundColor = 'var(--hover-bg)'"
        @mouseleave="(($event.currentTarget) as HTMLElement).style.backgroundColor = 'transparent'"
      >
        <FileText class="w-3.5 h-3.5 shrink-0" style="opacity: 0.4;" />
        <span class="truncate">{{ doc.name }}</span>
      </div>
    </div>
  </div>
</template>