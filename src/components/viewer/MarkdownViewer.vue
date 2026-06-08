<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import { FileText } from 'lucide-vue-next'
import { openFileDialog } from '@/services/tauriService'

const documentStore = useDocumentStore()
const tabStore = useTabStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}
</script>

<template>
  <!-- 无文档时: 空状态 -->
  <div v-if="!documentStore.currentDoc" class="h-full flex flex-col items-center justify-center" style="background-color: var(--bg);">
    <FileText class="w-16 h-16 mb-4" style="color: var(--text); opacity: 0.15;" />
    <p class="text-lg mb-2" style="color: var(--title); opacity: 0.6;">打开一个 Markdown 文档</p>
    <p class="text-sm mb-5" style="color: var(--text); opacity: 0.3;">从左侧目录选择文件，或使用 Ctrl+K 搜索</p>
    <button
      class="flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors"
      style="background-color: var(--primary); color: #fff;"
      @click="handleOpenFolder"
    >
      打开文件夹
    </button>
  </div>

  <!-- 有文档时: Markdown 内容 -->
  <div v-else class="h-full overflow-y-auto" style="background-color: var(--bg);">
    <div class="markdown-content" v-html="documentStore.currentDoc.html" />
  </div>
</template>