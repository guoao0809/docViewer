<script setup lang="ts">
import { Separator } from '@/components/ui/separator'
import DocTree from '@/components/sidebar/DocTree.vue'
import FavoritesList from '@/components/sidebar/FavoritesList.vue'
import RecentList from '@/components/sidebar/RecentList.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { Button } from '@/components/ui/button'
import { FolderPlus } from 'lucide-vue-next'

const documentStore = useDocumentStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}
</script>

<template>
  <aside
    class="flex flex-col overflow-hidden select-none"
    style="background-color: var(--sidebar); border-right: 1px solid var(--border);"
  >
    <div
      class="flex items-center justify-between px-4 text-xs font-semibold uppercase tracking-wider shrink-0"
      style="height: 35px; color: var(--text); opacity: 0.7;"
    >
      <span>Explorer</span>
      <Button variant="ghost" size="icon" class="h-6 w-6" @click="handleOpenFolder" title="打开文件夹">
        <FolderPlus class="w-3.5 h-3.5" />
      </Button>
    </div>

    <div v-if="!documentStore.rootPath" class="flex-1 flex flex-col items-center justify-center p-4 text-center">
      <p class="text-sm mb-3" style="color: var(--text); opacity: 0.5;">尚未打开文件夹</p>
      <Button variant="outline" size="sm" @click="handleOpenFolder">
        <FolderPlus class="w-3.5 h-3.5 mr-1" />
        打开文件夹
      </Button>
    </div>

    <template v-else>
      <FavoritesList />
      <Separator />
      <RecentList />
      <Separator />
      <DocTree />
    </template>
  </aside>
</template>
