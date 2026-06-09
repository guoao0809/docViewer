<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderOpen, Files } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const isDragging = ref(false)

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleDragOver() {
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  // In Tauri v2, dropped files have a `path` property on the File object
  for (const file of Array.from(files)) {
    const path = (file as any).path as string
    if (path) {
      await documentStore.doScanDirectory(path)
      break // Only process the first directory
    }
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col items-center justify-center"
    :style="{
      backgroundColor: isDragging ? 'var(--hover-bg)' : 'var(--bg)',
      borderColor: isDragging ? 'var(--primary)' : 'transparent',
      borderWidth: '2px',
      borderStyle: isDragging ? 'dashed' : 'none',
      transition: 'background-color 0.2s, border 0.2s',
    }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 大 Logo -->
    <div
      class="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
      style="background-color: var(--primary);"
    >
      <Files class="w-7 h-7 text-white" />
    </div>

    <h1 class="text-2xl font-bold mb-1" style="color: var(--title);">DocViewer</h1>
    <p class="text-sm mb-6" style="color: var(--text); opacity: 0.4;">面向开发者的本地知识库</p>

    <p class="text-base mb-4 text-center" :style="{ color: 'var(--text)', opacity: isDragging ? 0.8 : 0.5 }">
      {{ isDragging ? '释放以打开文件夹' : '拖拽 Markdown 文件夹到此处' }}
    </p>
    <p v-if="!isDragging" class="text-sm mb-6 text-center" style="color: var(--text); opacity: 0.3;">
      或点击按钮选择文件夹
    </p>

    <button
      class="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
      style="background-color: var(--primary); color: #fff;"
      @click="handleOpenFolder"
    >
      <FolderOpen class="w-5 h-5" />
      选择文件夹
    </button>

    <div class="mt-10 flex gap-6 text-xs" style="color: var(--text); opacity: 0.25;">
      <span><kbd style="background-color: var(--panel); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--border);">Ctrl+K</kbd> 搜索</span>
      <span><kbd style="background-color: var(--panel); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--border);">Ctrl+D</kbd> 收藏</span>
      <span><kbd style="background-color: var(--panel); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--border);">Ctrl+W</kbd> 关闭</span>
      <span><kbd style="background-color: var(--panel); padding: 2px 6px; border-radius: 3px; border: 1px solid var(--border);">Ctrl+\</kbd> 侧边栏</span>
    </div>
  </div>
</template>