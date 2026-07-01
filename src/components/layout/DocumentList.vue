<script setup lang="ts">
import { useDocumentStore } from '@/stores/documentStore'
import { useSettingStore } from '@/stores/settingStore'
import { Star, X, ChevronLeft } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const settingStore = useSettingStore()

const props = defineProps<{
  activeNav: string
}>()

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
    case 'png': case 'jpg': case 'jpeg': case 'gif':
    case 'webp': case 'svg': case 'bmp': case 'ico':
      return { letter: 'IMG', bgColor: 'bg-purple-500' }
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
    class="flex h-full flex-col overflow-hidden border-r border-border"
  >
    <!-- Favorites mode -->
    <template v-if="props.activeNav === 'favorites'">
      <!-- Header -->
      <div
        class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4"
      >
        <div class="flex items-center gap-2">
          <span class="text-base font-semibold text-title">收藏夹</span>
          <span class="rounded-full bg-panel px-2 py-0.5 text-base text-text/60">
            共 {{ documentStore.favoriteDocs.length }} 个文档
          </span>
        </div>
        <button
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text/50 transition-colors hover:bg-hover hover:text-text"
          title="收起文档列表"
          @click="settingStore.doToggleDocList()"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="documentStore.favoriteDocs.length === 0"
        class="flex flex-1 items-center justify-center p-4"
      >
        <span class="text-sm text-text/30">
          点击文档旁的星标收藏
        </span>
      </div>

      <!-- Favorites list -->
      <div v-else class="flex-1 overflow-y-auto">
        <div
          v-for="doc in documentStore.favoriteDocs"
          :key="doc.id"
          class="group flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition-colors"
          :class="{
            'bg-active': doc.id === documentStore.activeDocId,
            'hover:bg-hover': doc.id !== documentStore.activeDocId,
          }"
          @click="handleClick(doc)"
        >
          <!-- File type badge -->
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            :class="getFileTypeBadge(doc.type, doc.name).bgColor"
          >
            {{ getFileTypeBadge(doc.type, doc.name).letter }}
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="truncate text-base font-medium text-title">{{ doc.name }}</div>
            <div class="flex items-center gap-2 text-sm text-text/50">
              <span>{{ formatSize(doc.size) }}</span>
              <span class="rounded bg-panel px-1.5 py-0.5 text-sm">
                {{ documentStore.getFolderTag(doc.id) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <button
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-amber-400 transition-colors"
            @click="handleToggleStar($event, doc.id)"
            title="取消收藏"
          >
            <Star class="h-4 w-4 fill-current" />
          </button>

          <button
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text/50 opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
            @click="handleRemove($event, doc.id)"
            title="移除"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </template>

    <!-- All docs mode (recent opened) -->
    <template v-else>
      <!-- Header -->
      <div
        class="flex h-10 shrink-0 items-center justify-between border-b border-border px-4"
      >
        <div class="flex items-center gap-2">
          <span class="text-base font-semibold text-title">最近打开</span>
          <span class="rounded-full bg-panel px-2 py-0.5 text-base text-text/60">
            共 {{ documentStore.openedDocs.length }} 个文档
          </span>
        </div>
        <button
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text/50 transition-colors hover:bg-hover hover:text-text"
          title="收起文档列表"
          @click="settingStore.doToggleDocList()"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-if="documentStore.openedDocs.length === 0"
        class="flex flex-1 items-center justify-center p-4"
      >
        <span class="text-sm text-text/30">
          从左侧文件夹选择文档
        </span>
      </div>

      <!-- Document list -->
      <div v-else class="flex-1 overflow-y-auto">
        <div
          v-for="doc in documentStore.openedDocs"
          :key="doc.id"
          class="group flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3 transition-colors"
          :class="{
            'bg-active': doc.id === documentStore.activeDocId,
            'hover:bg-hover': doc.id !== documentStore.activeDocId,
          }"
          @click="handleClick(doc)"
        >
          <!-- File type badge -->
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            :class="getFileTypeBadge(doc.type, doc.name).bgColor"
          >
            {{ getFileTypeBadge(doc.type, doc.name).letter }}
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <div class="truncate text-base font-medium text-title">{{ doc.name }}</div>
            <div class="flex items-center gap-2 text-sm text-text/50">
              <span v-if="doc.lastOpen">{{ formatDate(doc.lastOpen) }}</span>
              <span>{{ formatSize(doc.size) }}</span>
              <span class="rounded bg-panel px-1.5 py-0.5 text-sm">
                {{ documentStore.getFolderTag(doc.id) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <button
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
            :class="doc.favorite ? 'text-amber-400' : 'text-text/20 opacity-0 group-hover:opacity-100'"
            @click="handleToggleStar($event, doc.id)"
            title="收藏"
          >
            <Star class="h-4 w-4" :class="doc.favorite ? 'fill-current' : ''" />
          </button>

          <button
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text/50 opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
            @click="handleRemove($event, doc.id)"
            title="移除"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>
    </template>
  </aside>
</template>
 