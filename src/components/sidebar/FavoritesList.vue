<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import type { DocMeta } from '@/types/document'
import { FileText, Star, ChevronDown, ChevronRight } from 'lucide-vue-next'

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

const favorites = computed(() => getAllDocs(documentStore.docTree).filter(d => d.favorite))

function openDoc(doc: DocMeta) {
  documentStore.doOpenDoc(doc)
}
</script>

<template>
  <div v-if="favorites.length > 0" class="border-b border-border">
    <div
      class="flex items-center gap-1 px-4 h-7 cursor-pointer text-xs font-semibold uppercase tracking-wider text-text/70"
      @click="collapsed = !collapsed"
    >
      <ChevronDown v-if="!collapsed" class="w-3.5 h-3.5 shrink-0" />
      <ChevronRight v-else class="w-3.5 h-3.5 shrink-0" />
      <Star class="w-3 h-3 shrink-0 text-primary" />
      <span>Favorites</span>
    </div>
    <div v-show="!collapsed">
      <div
        v-for="doc in favorites" :key="doc.id"
        class="flex items-center gap-2 px-4 cursor-pointer text-sm transition-colors text-text hover:bg-hover"
        style="line-height: 22px;"
        @click="openDoc(doc)"
      >
        <FileText class="w-3.5 h-3.5 shrink-0 text-text/40" />
        <span class="truncate">{{ doc.name }}</span>
      </div>
    </div>
  </div>
</template>