<script setup lang="ts">
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderOpen, Files } from 'lucide-vue-next'

const documentStore = useDocumentStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center" style="background-color: var(--bg);">
    <!-- 大 Logo -->
    <div
      class="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
      style="background-color: var(--primary);"
    >
      <Files class="w-7 h-7 text-white" />
    </div>

    <h1 class="text-2xl font-bold mb-1" style="color: var(--title);">DocViewer</h1>
    <p class="text-sm mb-6" style="color: var(--text); opacity: 0.4;">面向开发者的本地知识库</p>

    <p class="text-base mb-4 text-center" style="color: var(--text); opacity: 0.5;">
      拖拽 Markdown 文件夹到此处
    </p>
    <p class="text-sm mb-6 text-center" style="color: var(--text); opacity: 0.3;">
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