<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { useLauncher } from '@/composables/useLauncher'
import { Search, X, Clock, Keyboard } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()
const { notifyOpenDoc, closeLauncherOnly } = useLauncher()

const inputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')

// 在 launcher 窗口内，对最近文档进行本地过滤
const filteredDocs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const source = documentStore.openedDocs

  if (!q) return source.slice(0, 6)

  // 本地名称过滤（小窗不需要全文搜索索引，保持轻量）
  return source.filter(d =>
    d.name.toLowerCase().includes(q) ||
    documentStore.getFolderTag(d.id).toLowerCase().includes(q)
  ).slice(0, 6)
})

// 文件类型徽章
interface FileTypeBadge { letter: string; bgColor: string }
function getFileTypeBadge(_type: string, name: string): FileTypeBadge {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'md': case 'markdown': return { letter: 'M↓', bgColor: 'bg-blue-500' }
    case 'json': return { letter: 'J', bgColor: 'bg-yellow-500' }
    case 'pdf': return { letter: 'PDF', bgColor: 'bg-red-500' }
    case 'yaml': case 'yml': return { letter: 'Y', bgColor: 'bg-orange-500' }
    case 'toml': return { letter: 'T', bgColor: 'bg-purple-500' }
    case 'xml': return { letter: 'X', bgColor: 'bg-teal-500' }
    case 'csv': return { letter: 'C', bgColor: 'bg-green-600' }
    default: return { letter: ext.slice(0, 3).toUpperCase(), bgColor: 'bg-green-500' }
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
  searchStore.doAddToHistory(searchQuery.value)
  notifyOpenDoc(doc.id)
}

function handleClose() {
  closeLauncherOnly()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

function handleSearch() {
  // 搜索已经通过 computed 实时过滤
  // 点击按钮时聚焦输入框
  inputRef.value?.focus()
}

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col bg-surface border border-border rounded-xl overflow-hidden shadow-2xl"
    @keydown="handleKeyDown"
  >
    <!-- 标题栏 -->
    <header
      class="flex items-center justify-between h-10 px-4 shrink-0 select-none"
      data-tauri-drag-region
    >
      <div class="flex items-center gap-2">
        <div class="w-5 h-5 rounded flex items-center justify-center bg-primary">
          <span class="text-white text-xs font-bold">D</span>
        </div>
        <span class="text-sm font-semibold text-title">DocViewer</span>
      </div>
      <button
        class="h-6 w-6 flex items-center justify-center rounded text-text/50 hover:text-text hover:bg-hover transition-colors"
        data-tauri-drag-region="false"
        @click="handleClose"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </header>

    <!-- 搜索区 -->
    <div class="px-4 py-2.5 shrink-0">
      <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-bg border border-border">
        <Search class="w-4 h-4 text-text/40 shrink-0" />
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-sm text-text placeholder:text-text/40"
          placeholder="搜索文档 (Ctrl+K)"
          @keydown.stop
        />
        <button
          class="shrink-0 px-3 py-1 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
          @click="handleSearch"
        >
          搜索
        </button>
      </div>
    </div>

    <!-- 最近文档列表 -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <div class="flex items-center justify-between px-4 h-7 shrink-0">
        <span class="text-xs text-text/50">
          {{ searchQuery ? '搜索结果' : '最近文档' }}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto px-2">
        <!-- 空状态 -->
        <div
          v-if="filteredDocs.length === 0"
          class="flex items-center justify-center py-10"
        >
          <span class="text-sm text-text/30">
            {{ documentStore.openedDocs.length === 0 ? '从主窗口打开文档' : '未找到匹配的文档' }}
          </span>
        </div>

        <!-- 文档条目 -->
        <div
          v-for="doc in filteredDocs"
          :key="doc.id"
          class="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors hover:bg-hover"
          @click="handleClick(doc)"
        >
          <!-- 文件类型徽章 -->
          <div
            class="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
            :class="getFileTypeBadge(doc.type, doc.name).bgColor"
          >
            {{ getFileTypeBadge(doc.type, doc.name).letter }}
          </div>

          <!-- 信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium truncate text-title">{{ doc.name }}</span>
              <span class="text-xs text-text/40 shrink-0">{{ formatSize(doc.size) }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-text/40">
              <span>{{ documentStore.getFolderTag(doc.id) }}</span>
              <span v-if="doc.lastOpen">{{ formatDate(doc.lastOpen) }}</span>
            </div>
          </div>

          <!-- 收藏图标 -->
          <span
            v-if="doc.favorite"
            class="text-amber-400 text-xs shrink-0"
            title="已收藏"
          >★</span>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="flex items-center justify-between px-4 h-9 shrink-0 border-t border-border">
      <div class="flex items-center gap-1">
        <button
          class="flex items-center gap-1 px-2 py-1 rounded text-xs text-text/50 hover:text-text hover:bg-hover transition-colors"
        >
          <Clock class="w-3 h-3" />
          <span>最近文档</span>
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="flex items-center gap-1 px-2 py-1 rounded text-xs text-text/50 hover:text-text hover:bg-hover transition-colors"
        >
          <Keyboard class="w-3 h-3" />
          <span>快捷键</span>
        </button>
      </div>
    </div>
  </div>
</template>
