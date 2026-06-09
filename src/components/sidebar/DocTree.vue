<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import type { DocMeta } from '@/types/document'
import DocTreeRecursive from './DocTreeRecursive.vue'

const props = defineProps<{
  filter?: string
}>()

const documentStore = useDocumentStore()

/** Filter tree: keep entries whose name matches, or whose children contain matches. */
function filterTree(docs: DocMeta[], query: string): DocMeta[] {
  if (!query) return docs
  const lower = query.toLowerCase()
  const result: DocMeta[] = []
  for (const doc of docs) {
    if (doc.children) {
      const filteredChildren = filterTree(doc.children, query)
      if (filteredChildren.length > 0 || doc.name.toLowerCase().includes(lower)) {
        result.push({ ...doc, children: filteredChildren.length > 0 ? filteredChildren : doc.children })
      }
    } else {
      if (doc.name.toLowerCase().includes(lower)) {
        result.push(doc)
      }
    }
  }
  return result
}

const filteredTree = computed(() => filterTree(documentStore.docTree, props.filter ?? ''))

/** When filter is active, auto-expand all folders so matches are visible */
const shouldAutoExpand = computed(() => !!props.filter && props.filter.length > 0)
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div v-if="filteredTree.length === 0" class="px-4 py-3 text-sm text-text/40">
      {{ props.filter ? '未找到匹配的文件' : '未找到支持的文档文件' }}
    </div>

    <DocTreeRecursive
      v-for="doc in filteredTree"
      :key="doc.id"
      :doc="doc"
      :depth="0"
      :should-auto-expand="shouldAutoExpand"
    />
  </div>
</template>

