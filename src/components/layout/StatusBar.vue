<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'

const documentStore = useDocumentStore()

const statusText = computed(() => {
  const doc = documentStore.currentDoc
  if (!doc) return 'DocViewer — 未打开文档'
  const size = doc.meta.size > 1024 * 1024
    ? `${(doc.meta.size / (1024 * 1024)).toFixed(1)} MB`
    : doc.meta.size > 1024
    ? `${(doc.meta.size / 1024).toFixed(1)} KB`
    : `${doc.meta.size} B`
  const lines = doc.raw.split('\n').length
  return `${doc.meta.path}  |  ${size}  |  ${lines} 行`
})
</script>

<template>
  <footer
    class="flex items-center justify-between px-3 text-xs select-none shrink-0"
    style="background-color: var(--primary); color: #fff; height: 24px;"
  >
    <span class="truncate mr-4">{{ statusText }}</span>
    <span class="shrink-0">UTF-8</span>
  </footer>
</template>
