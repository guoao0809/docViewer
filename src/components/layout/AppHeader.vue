<script setup lang="ts">
import { useSearchStore } from '@/stores/searchStore'
import { useSettingStore } from '@/stores/settingStore'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { Button } from '@/components/ui/button'
import { Search, FolderOpen, Minimize2, Sun, Moon } from 'lucide-vue-next'

const searchStore = useSearchStore()
const settingStore = useSettingStore()
const documentStore = useDocumentStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleSearchClick() { searchStore.doOpenSearch() }
function handleToggleTheme() { settingStore.doToggleTheme() }
</script>

<template>
  <header
    class="flex items-center justify-between px-3 select-none shrink-0"
    style="background-color: var(--sidebar); border-bottom: 1px solid var(--border);"
  >
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded flex items-center justify-center" style="background-color: var(--primary);">
        <span class="text-white text-xs font-bold">D</span>
      </div>
      <span class="text-sm font-semibold" style="color: var(--title);">DocViewer</span>
    </div>

    <div class="flex-1 max-w-xl mx-4">
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded text-sm cursor-pointer"
        style="background-color: var(--bg); border: 1px solid var(--border); color: var(--text);"
        @click="handleSearchClick"
      >
        <Search class="w-4 h-4 opacity-50" />
        <span class="opacity-60">搜索文档...</span>
        <kbd class="ml-auto text-xs px-1.5 py-0.5 rounded opacity-40" style="background-color: var(--panel);">Ctrl+K</kbd>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <Button variant="ghost" size="icon" @click="handleOpenFolder" title="打开文件夹">
        <FolderOpen class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" title="Mini Window (V1.1)">
        <Minimize2 class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" @click="handleToggleTheme" title="切换主题">
        <Sun v-if="settingStore.theme === 'dark'" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </Button>
    </div>
  </header>
</template>
