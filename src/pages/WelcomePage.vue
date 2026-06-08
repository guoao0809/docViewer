<script setup lang="ts">
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { Button } from '@/components/ui/button'
import { FolderOpen, Files } from 'lucide-vue-next'

const documentStore = useDocumentStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center" style="background-color: var(--bg);">
    <div class="mb-6 flex items-center gap-3">
      <div class="w-12 h-12 rounded-lg flex items-center justify-center" style="background-color: var(--primary);">
        <Files class="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 class="text-2xl font-bold" style="color: var(--title);">DocViewer</h1>
        <p class="text-sm" style="color: var(--text); opacity: 0.5;">面向开发者的本地知识库</p>
      </div>
    </div>

    <p class="text-base mb-6 text-center max-w-md" style="color: var(--text); opacity: 0.6;">
      拖拽 Markdown 文件夹到此处
      <br />
      <span class="text-sm opacity-50">或点击按钮选择文件夹</span>
    </p>

    <Button size="lg" @click="handleOpenFolder">
      <FolderOpen class="w-5 h-5 mr-2" />
      选择文件夹
    </Button>

    <div class="mt-8 flex gap-6 text-xs" style="color: var(--text); opacity: 0.3;">
      <span>Ctrl+K 搜索</span>
      <span>Ctrl+D 收藏</span>
      <span>Ctrl+W 关闭</span>
      <span>Ctrl+\ 侧边栏</span>
    </div>
  </div>
</template>
