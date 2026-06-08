<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import type { DocMeta } from '@/types/document'
import { FileText } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const tabStore = useTabStore()

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
  tabStore.doOpenTab(doc.id, doc.name)
  documentStore.doLoadDocument(doc.id)
}
</script>

<template>
  <div v-if="recentDocs.length > 0">
    <div class="flex items-center px-4 text-xs font-semibold uppercase tracking-wider" style="height: 30px; color: var(--text); opacity: 0.7;">
      Recent
    </div>
    <div
      v-for="doc in recentDocs" :key="doc.id"
      class="flex items-center gap-1.5 px-4 py-0.5 cursor-pointer text-sm hover:opacity-80"
      style="color: var(--text);"
      @click="openDoc(doc)"
    >
      <FileText class="w-3.5 h-3.5 shrink-0 opacity-50" />
      <span class="truncate">{{ doc.name }}</span>
    </div>
  </div>
</template>
