<script setup lang="ts">
import { ref, watch } from 'vue'
import DocTree from '@/components/sidebar/DocTree.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderPlus, FilePlus, ChevronsUpDown, Star, FileText, Search } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

defineProps<{
  activeNav: string
}>()

const emit = defineEmits<{
  navChange: [key: string]
}>()

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

const createMode = ref<'file' | 'folder' | null>(null)

const navItems = [
  { key: 'favorites', icon: Star,      label: '收藏夹' },
  { key: 'all',       icon: FileText,  label: '全部文档' },
  { key: 'history',   icon: Search,    label: '搜索历史' },
]

async function handleAddFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleNavClick(key: string) {
  emit('navChange', key)
}

function handleCreateMode(mode: 'file' | 'folder') {
  if (!documentStore.selectedNodeId) return
  documentStore.expandedDirs.add(documentStore.selectedNodeId)
  documentStore.expandedDirs = new Set(documentStore.expandedDirs)
  createMode.value = mode
}

function handleCancelCreate() {
  createMode.value = null
}

function handleCollapseAll() {
  documentStore.doCollapseAll()
}

// 点击文件后自动切换到「最近打开」
watch(() => documentStore.currentDoc, () => {
  if (emit) emit('navChange', 'all')
})
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
    <div class="px-2 shrink-0 space-y-0.5 pt-1.5">
      <div
        v-for="item in navItems"
        :key="item.key"
        class="flex items-center gap-2 px-3 py-2.5 rounded-md cursor-pointer text-base transition-colors"
        :class="{
          'bg-active text-title font-medium': activeNav === item.key,
          'text-text hover:bg-active': activeNav !== item.key,
        }"
        @click="item.key === 'history' ? searchStore.doOpenSearchWithHistory() : handleNavClick(item.key)"
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0 opacity-60" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 my-2 border-t border-border" />

    <!-- Project folders section -->
    <div class="flex items-center justify-between px-4 h-8 shrink-0 text-base font-semibold tracking-wider text-text/60">
      <span>项目</span>
      <div class="flex items-center gap-0.5">
        <button
          class="h-5 w-5 flex items-center justify-center rounded text-text/50 hover:bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          :disabled="!documentStore.selectedNodeId"
          @click="handleCreateMode('folder')"
          title="新建文件夹"
        >
          <FolderPlus class="w-3.6 h-3.6" />
        </button>
        <button
          class="h-5 w-5 flex items-center justify-center rounded text-text/50 hover:bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          :disabled="!documentStore.selectedNodeId"
          @click="handleCreateMode('file')"
          title="新建文件"
        >
          <FilePlus class="w-3.5 h-3.5" />
        </button>
        <button
          class="h-5 w-5 flex items-center justify-center rounded text-text/50 hover:bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
          :disabled="documentStore.expandedDirs.size === 0"
          @click="handleCollapseAll"
          title="收起文件夹"
        >
          <ChevronsUpDown class="3.5 3.5" />
        </button>
      </div>
    </div>

    <!-- Folder tree -->
    <div class="flex-1 overflow-y-auto px-2">
      <DocTree :create-mode="createMode" @cancel-create="handleCancelCreate" />
    </div>

    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      :open="documentStore.pendingRemoveId !== null"
      title="确认移除"
      :description="`确定要移除文件夹「${documentStore.pendingRemoveName}」吗？其中的所有文件将从列表中移除。`"
      @confirm="documentStore.doConfirmRemove()"
      @cancel="documentStore.doCancelRemove()"
      @update:open="!$event && documentStore.doCancelRemove()"
    />
  </aside>
</template>
