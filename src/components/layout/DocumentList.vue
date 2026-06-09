<script setup lang="ts">
import { useDocumentStore } from '@/stores/documentStore'
import { Star, X } from 'lucide-vue-next'

const documentStore = useDocumentStore()

interface FileTypeBadge {
  letter: string
  bgColor: string
}

function getFileTypeBadge(type: string, name: string): FileTypeBadge {
  const ext = name.split('.').pop()?.toLowerCase() || ''

  switch (ext) {
    case 'md':
    case 'markdown':
      return { letter: 'M↓', bgColor: 'bg-blue-500' }
    case 'json':
      return { letter: 'J', bgColor: 'bg-yellow-500' }
    case 'pdf':
      return { letter: 'PDF', bgColor: 'bg-red-500' }
    case 'sketch':
      return { letter: 'SK', bgColor: 'bg-gray-400' }
    default:
      return { letter: ext.slice(0, 3).toUpperCase(), bgColor: 'bg-green-500' }
  }
}

function formatDate(ts: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function handleClick(doc: typeof documentStore.openedDocs[number]) {
  documentStore.doOpenDoc(doc)
}

function handleRemove(event: Event, docId: string) {
  event.stopPropagation()
  documentStore.doRemoveOpenedDoc(docId)
}

function handleToggleStar(event: Event, docId: string) {
  event.stopPropagation()
  documentStore.doToggleFavorite(docId)
}
</script>

<template>
  <aside
    class="flex flex-col overflow-hidden border-r border-border bg-surface"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-title">全部文档</span>
        <span class="text-xs rounded-full px-1.5 py-0.5 bg-panel text-text/60">
          共 {{ documentStore.openedDocs.length }} 个文档
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="documentStore.openedDocs.length === 0"
      class="flex-1 flex items-center justify-center p-4"
    >
      <span class="text-xs text-text/30">
        从左侧文件夹选择文档
      </span>
    </div>

    <!-- Document list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="doc in documentStore.openedDocs"
        :key="doc.id"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border group transition-colors"
        :class="{
          'bg-active': doc.id === documentStore.activeDocId,
          'hover:bg-hover': doc.id !== documentStore.activeDocId,
        }"
        @click="handleClick(doc)"
      >
        <!-- File type badge -->
        <div
          class="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
          :class="getFileTypeBadge(doc.type, doc.name).bgColor"
        >
          {{ getFileTypeBadge(doc.type, doc.name).letter }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate text-title">{{ doc.name }}</div>
          <div class="flex items-center gap-2 text-xs text-text/50">
            <span v-if="doc.lastOpen">{{ formatDate(doc.lastOpen) }}</span>
            <span>{{ formatSize(doc.size) }}</span>
            <span class="px-1.5 py-0.5 rounded text-xs bg-panel">
              {{ documentStore.getFolderTag(doc.id) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded transition-colors"
          :class="doc.favorite ? 'text-amber-400' : 'text-text/20 opacity-0 group-hover:opacity-100'"
          @click="handleToggleStar($event, doc.id)"
          title="收藏"
        >
          <Star class="w-4 h-4" :class="doc.favorite ? 'fill-current' : ''" />
        </button>

        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-text/50 hover:text-text"
          @click="handleRemove($event, doc.id)"
          title="移除"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
