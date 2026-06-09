<script setup lang="ts">
import { useDocumentStore } from '@/stores/documentStore'
import { FileText, FileCode, Star, X } from 'lucide-vue-next'

const documentStore = useDocumentStore()

function getFileIcon(type: string) {
  return type === 'markdown' ? FileText : FileCode
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
    class="flex flex-col overflow-hidden border-r"
    style="background-color: var(--sidebar); border-color: var(--border);"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 h-10 shrink-0"
      style="border-bottom: 1px solid var(--border);"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold" style="color: var(--title);">全部文档</span>
        <span class="text-xs rounded-full px-1.5 py-0.5" style="background-color: var(--panel); color: var(--text); opacity: 0.6;">
          共 {{ documentStore.openedDocs.length }} 个文档
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="documentStore.openedDocs.length === 0"
      class="flex-1 flex items-center justify-center p-4"
    >
      <span class="text-xs" style="color: var(--text); opacity: 0.3;">
        从左侧文件夹选择文档
      </span>
    </div>

    <!-- Document list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="doc in documentStore.openedDocs"
        :key="doc.id"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b group transition-colors"
        :style="{
          backgroundColor: doc.id === documentStore.activeDocId ? 'var(--active-bg)' : 'transparent',
          borderColor: 'var(--border)',
        }"
        @click="handleClick(doc)"
        @mouseenter="(($event.currentTarget) as HTMLElement).style.backgroundColor = doc.id === documentStore.activeDocId ? 'var(--active-bg)' : 'var(--hover-bg)'"
        @mouseleave="(($event.currentTarget) as HTMLElement).style.backgroundColor = doc.id === documentStore.activeDocId ? 'var(--active-bg)' : 'transparent'"
      >
        <!-- File icon -->
        <component :is="getFileIcon(doc.type)" class="w-5 h-5 shrink-0" style="opacity: 0.5;" />

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate" style="color: var(--title);">{{ doc.name }}</div>
          <div class="flex items-center gap-2 text-xs" style="color: var(--text); opacity: 0.5;">
            <span v-if="doc.lastOpen">{{ formatDate(doc.lastOpen) }}</span>
            <span>{{ formatSize(doc.size) }}</span>
            <span class="px-1.5 py-0.5 rounded text-xs" style="background-color: var(--panel); opacity: 0.8;">
              {{ documentStore.getFolderTag(doc.id) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          :style="{ color: doc.favorite ? '#e8a44a' : 'var(--text)', opacity: doc.favorite ? 1 : 0.3 }"
          @click="handleToggleStar($event, doc.id)"
          title="收藏"
        >
          <Star class="w-4 h-4" :class="doc.favorite ? 'fill-current' : ''" />
        </button>

        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity"
          @click="handleRemove($event, doc.id)"
          title="移除"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
