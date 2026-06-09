<script setup lang="ts">
import { useSearchStore } from '@/stores/searchStore'
import { useSettingStore } from '@/stores/settingStore'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Search, FolderOpen, Sun, Moon, Minus, Square, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const searchStore = useSearchStore()
const settingStore = useSettingStore()
const documentStore = useDocumentStore()
const appWindow = getCurrentWindow()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleSearchClick() { searchStore.doOpenSearch() }
function handleToggleTheme() { settingStore.doToggleTheme() }
</script>

<template>
  <header
    class="flex items-center justify-between h-12 px-4 select-none shrink-0 bg-surface border-b border-border"
    data-tauri-drag-region
  >
    <!-- 左侧: Logo + 名称 -->
    <div class="flex items-center gap-3 shrink-0">
      <div
        class="w-7 h-7 rounded-md flex items-center justify-center bg-primary"
      >
        <span class="text-white text-sm font-bold">D</span>
      </div>
      <span class="text-sm font-semibold tracking-wide text-title">DocViewer</span>
    </div>

    <!-- 中间: 搜索入口 -->
    <div class="flex-1 max-w-2xl mx-6 cursor-pointer" @click="handleSearchClick">
      <div
        class="flex items-center gap-2 h-9 px-4 rounded-lg text-sm bg-bg border border-border text-text"
      >
        <Search class="w-4 h-4 shrink-0 opacity-50" />
        <span class="opacity-50">搜索文档...</span>
        <kbd
          class="ml-auto text-xs px-2 py-0.5 rounded bg-panel border border-border opacity-40 font-mono"
        >Ctrl+K</kbd>
      </div>
    </div>

    <!-- 右侧: 操作按钮 -->
    <div class="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        class="text-text hover:bg-hover"
        @click="handleOpenFolder"
        title="打开文件夹"
      >
        <FolderOpen class="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="text-text hover:bg-hover"
        @click="handleToggleTheme"
        :title="settingStore.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
      >
        <Sun v-if="settingStore.theme === 'dark'" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </Button>

      <!-- Window controls -->
      <div class="flex items-center ml-1" data-tauri-drag-region="false">
        <Button
          variant="ghost"
          size="icon"
          class="text-text hover:bg-hover"
          @click="appWindow.minimize()"
          title="最小化"
        >
          <Minus class="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-text hover:bg-hover"
          @click="appWindow.toggleMaximize()"
          title="最大化"
        >
          <Square class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-text hover:bg-red-500/80"
          @click="appWindow.close()"
          title="关闭"
        >
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </header>
</template>
