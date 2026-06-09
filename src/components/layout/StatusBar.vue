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
