<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderOpen, Files } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

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

  for (const file of Array.from(files)) {
    const path = (file as any).path as string
    if (path) {
      await documentStore.doScanDirectory(path)
      break
    }
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col items-center justify-center transition-all duration-200"
    :class="{
      'bg-active border-2 border-dashed border-primary': isDragging,
      'bg-bg': !isDragging,
    }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 大 Logo -->
    <div
      class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-primary"
    >
      <Files class="w-7 h-7 text-white" />
    </div>

    <h1 class="text-2xl font-bold mb-1 text-title">DocViewer</h1>
    <p class="text-sm mb-6 text-text/40">面向开发者的本地知识库</p>

    <p class="text-base mb-4 text-center" :class="isDragging ? 'text-text/80' : 'text-text/50'">
      {{ isDragging ? '释放以打开文件夹' : '拖拽 Markdown 文件夹到此处' }}
    </p>
    <p v-if="!isDragging" class="text-sm mb-6 text-center text-text/30">
      或点击按钮选择文件夹
    </p>

    <Button class="bg-primary text-white hover:bg-primary/90 px-6 py-2.5" @click="handleOpenFolder">
      <FolderOpen class="w-5 h-5" />
      选择文件夹
    </Button>

    <div class="mt-10 flex gap-6 text-xs text-text/25">
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+K</kbd> 搜索</span>
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+D</kbd> 收藏</span>
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+W</kbd> 关闭</span>
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+\</kbd> 侧边栏</span>
    </div>
  </div>
</template>
