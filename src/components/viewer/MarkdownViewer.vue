<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { openFileDialog } from '@/services/tauriService'

const documentStore = useDocumentStore()
const tabStore = useTabStore()
const scrollContainer = ref<InstanceType<typeof ScrollArea> | null>(null)

watch(() => documentStore.currentDoc, () => {
  nextTick(() => {
    const tab = tabStore.activeTab
    if (tab && scrollContainer.value) {
      const el = (scrollContainer.value.$el as HTMLElement)
      const viewport = el.querySelector('[data-radix-scroll-area-viewport]')
      if (viewport) viewport.scrollTop = tab.scrollTop
    }
  })
})

function handleScroll() {
  const tab = tabStore.activeTab
  if (!tab || !scrollContainer.value) return
  const el = (scrollContainer.value.$el as HTMLElement)
  const viewport = el.querySelector('[data-radix-scroll-area-viewport]')
  if (viewport) tabStore.doSaveScrollPosition(tab.docId, viewport.scrollTop)
}

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}
</script>

<template>
  <div v-if="!documentStore.currentDoc" class="h-full flex flex-col items-center justify-center" style="background-color: var(--bg);">
    <FileText class="w-16 h-16 mb-4 opacity-20" />
    <p class="text-lg mb-2" style="color: var(--text); opacity: 0.5;">打开一个 Markdown 文档</p>
    <p class="text-sm mb-4" style="color: var(--text); opacity: 0.3;">从左侧目录选择文件，或使用 Ctrl+K 搜索</p>
    <Button variant="outline" size="sm" @click="handleOpenFolder">打开文件夹</Button>
  </div>

  <ScrollArea v-else ref="scrollContainer" class="h-full" @scroll="handleScroll">
    <div class="markdown-content" v-html="documentStore.currentDoc.html" />
  </ScrollArea>
</template>
