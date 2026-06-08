<script setup lang="ts">
import { useSearchStore } from '@/stores/searchStore'
import { useSettingStore } from '@/stores/settingStore'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
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
    class="flex items-center justify-between h-12 px-4 select-none shrink-0"
    style="background-color: var(--sidebar);"
  >
    <!-- 左侧: Logo + 名称 -->
    <div class="flex items-center gap-3 shrink-0">
      <div
        class="w-7 h-7 rounded flex items-center justify-center"
        style="background-color: var(--primary);"
      >
        <span class="text-white text-sm font-bold">D</span>
      </div>
      <span class="text-sm font-semibold tracking-wide" style="color: var(--title);">DocViewer</span>
    </div>

    <!-- 中间: 搜索入口 -->
    <div
      class="flex-1 max-w-lg mx-6 cursor-pointer"
      @click="handleSearchClick"
    >
      <div
        class="flex items-center gap-2 h-8 px-4 rounded-md text-sm"
        style="background-color: var(--bg); border: 1px solid var(--border); color: var(--text);"
      >
        <Search class="w-4 h-4 shrink-0" style="opacity: 0.5;" />
        <span style="opacity: 0.5;">搜索文档...</span>
        <kbd
          class="ml-auto text-xs px-2 py-0.5 rounded shrink-0"
          style="background-color: var(--panel); border: 1px solid var(--border); opacity: 0.4; font-family: inherit;"
        >Ctrl+K</kbd>
      </div>
    </div>

    <!-- 右侧: 操作按钮 -->
    <div class="flex items-center gap-2 shrink-0">
      <button
        class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
        style="color: var(--text);"
        @click="handleOpenFolder"
        title="打开文件夹"
      >
        <FolderOpen class="w-4 h-4" />
      </button>
      <button
        class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
        style="color: var(--text); opacity: 0.5;"
        title="Mini Window (V1.1)"
      >
        <Minimize2 class="w-4 h-4" />
      </button>
      <button
        class="h-8 w-8 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
        style="color: var(--text);"
        @click="handleToggleTheme"
        title="切换主题"
      >
        <Sun v-if="settingStore.theme === 'dark'" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>