<script setup lang="ts">
import { computed } from 'vue'
import DocTree from '@/components/sidebar/DocTree.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderPlus, Clock, Star, FileText, Search, Settings } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

const navItems = [
  { key: 'recent',   icon: Clock,     label: '最近打开' },
  { key: 'favorites',icon: Star,      label: '收藏夹' },
  { key: 'all',      icon: FileText,  label: '全部文档' },
  { key: 'history',  icon: Search,    label: '搜索历史' },
]

const activeNav = computed(() => 'all')

async function handleAddFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleNavClick(_key: string) {
  // Future: filter document list by category
}

function handleSearchHistory() {
  searchStore.doOpenSearch()
}
</script>

<template>
  <aside class="flex flex-col overflow-hidden select-none" style="background-color: var(--sidebar);">
    <!-- Add document button -->
    <div class="px-3 py-3 shrink-0">
      <button
        class="flex items-center justify-center gap-2 w-full py-2 rounded text-sm font-medium transition-colors"
        style="background-color: var(--primary); color: #fff;"
        @click="handleAddFolder"
      >
        <FolderPlus class="w-4 h-4" />
        添加文档
      </button>
    </div>

    <!-- Navigation menu -->
    <div class="px-2 shrink-0">
      <div
        v-for="item in navItems"
        :key="item.key"
        class="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm transition-colors"
        :style="{
          backgroundColor: activeNav === item.key ? 'var(--active-bg)' : 'transparent',
          color: activeNav === item.key ? 'var(--title)' : 'var(--text)',
        }"
        @click="item.key === 'history' ? handleSearchHistory() : handleNavClick(item.key)"
        @mouseenter="(($event.currentTarget) as HTMLElement).style.backgroundColor = activeNav === item.key ? 'var(--active-bg)' : 'var(--hover-bg)'"
        @mouseleave="(($event.currentTarget) as HTMLElement).style.backgroundColor = activeNav === item.key ? 'var(--active-bg)' : 'transparent'"
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0" style="opacity: 0.6;" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 my-2" style="border-top: 1px solid var(--border);" />

    <!-- Project folders section -->
    <div class="flex items-center justify-between px-4 h-7 shrink-0 text-xs font-semibold uppercase tracking-wider" style="color: var(--text); opacity: 0.6;">
      <span>项目</span>
      <button class="h-5 w-5 flex items-center justify-center rounded hover:bg-white/5" @click="handleAddFolder" title="添加文件夹">
        <FolderPlus class="w-3 h-3" />
      </button>
    </div>

    <!-- Folder tree -->
    <div class="flex-1 overflow-y-auto">
      <DocTree />
    </div>

    <!-- Settings at bottom -->
    <div style="border-top: 1px solid var(--border);">
      <div
        class="flex items-center gap-2 px-4 py-2 cursor-pointer text-sm transition-colors"
        style="color: var(--text); opacity: 0.6;"
        @mouseenter="(($event.currentTarget) as HTMLElement).style.backgroundColor = 'var(--hover-bg)'"
        @mouseleave="(($event.currentTarget) as HTMLElement).style.backgroundColor = 'transparent'"
      >
        <Settings class="w-4 h-4 shrink-0" />
        <span>设置</span>
      </div>
    </div>
  </aside>
</template>
