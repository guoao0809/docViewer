<script setup lang="ts">
import { computed } from 'vue'
import DocTree from '@/components/sidebar/DocTree.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderPlus, Clock, Star, FileText, Search, Settings } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

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
  <aside class="flex flex-col overflow-hidden select-none bg-surface">
    <!-- Add document button -->
    <div class="px-3 py-3 shrink-0">
      <Button
        class="w-full bg-primary text-white hover:bg-primary/90 font-medium"
        @click="handleAddFolder"
      >
        <FolderPlus class="w-4 h-4" />
        添加文档
      </Button>
    </div>

    <!-- Navigation menu -->
    <div class="px-2 shrink-0 space-y-0.5">
      <div
        v-for="item in navItems"
        :key="item.key"
        class="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors"
        :class="{
          'bg-active text-title font-medium': activeNav === item.key,
          'text-text hover:bg-hover': activeNav !== item.key,
        }"
        @click="item.key === 'history' ? handleSearchHistory() : handleNavClick(item.key)"
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0 opacity-60" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 my-2 border-t border-border" />

    <!-- Project folders section -->
    <div class="flex items-center justify-between px-4 h-7 shrink-0 text-xs font-semibold uppercase tracking-wider text-text/60">
      <span>项目</span>
      <Button variant="ghost" size="icon-sm" class="h-5 w-5 text-text/60 hover:bg-hover" @click="handleAddFolder" title="添加文件夹">
        <FolderPlus class="w-3 h-3" />
      </Button>
    </div>

    <!-- Folder tree -->
    <div class="flex-1 overflow-y-auto px-2">
      <DocTree />
    </div>

    <!-- Settings at bottom -->
    <div class="border-t border-border mt-auto">
      <div
        class="flex items-center gap-2 px-4 py-2 cursor-pointer text-sm text-text/60 hover:bg-hover transition-colors"
      >
        <Settings class="w-4 h-4 shrink-0" />
        <span>设置</span>
      </div>
    </div>
  </aside>
</template>
