<script setup lang="ts">
import { ref } from 'vue'
import DocTree from '@/components/sidebar/DocTree.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { useSettingStore } from '@/stores/settingStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderPlus, Plus, ChevronsUpDown, Search, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()
const settingStore = useSettingStore()

const createMode = ref<'file' | 'folder' | null>(null)

async function handleAddFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleCreateMode(mode: 'file' | 'folder') {
  if (!documentStore.selectedNodeId) return
  createMode.value = mode
}

function handleCancelCreate() {
  createMode.value = null
}

function handleCollapseAll() {
  documentStore.doCollapseAll()
}

// 收起态：点击「添加文档」先展开侧边栏再打开文件夹选择
async function handleCollapsedAdd() {
  settingStore.doToggleSidebar()
  handleAddFolder()
}

// 收起态：点击搜索历史导航
function handleCollapsedNav() {
  searchStore.doOpenSearchWithHistory()
}
</script>

<template>
  <aside class="flex h-full flex-col overflow-hidden select-none bg-surface">
    <!-- ===== 收起态：图标轨道 ===== -->
    <template v-if="settingStore.sidebarCollapsed">
      <div class="flex h-full w-full flex-col items-center gap-1 py-3">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-md text-text/50 transition-colors hover:bg-hover hover:text-text"
          title="展开侧边栏"
          @click="settingStore.doToggleSidebar()"
        >
          <PanelLeftOpen class="h-4.5 w-4.5" />
        </button>

        <div class="my-1 h-px w-5 bg-border" />

        <button
          class="flex h-9 w-9 items-center justify-center rounded-md text-text/50 transition-colors hover:bg-hover hover:text-text"
          title="添加文档"
          @click="handleCollapsedAdd"
        >
          <FolderPlus class="h-4.5 w-4.5" />
        </button>

        <div class="my-1 h-px w-5 bg-border" />

        <button
          class="flex h-9 w-9 items-center justify-center rounded-md text-text/50 transition-colors hover:bg-hover hover:text-text"
          title="搜索历史"
          @click="handleCollapsedNav"
        >
          <Search class="h-4.5 w-4.5" />
        </button>
      </div>
    </template>

    <!-- ===== 展开态：完整面板 ===== -->
    <template v-else>
      <!-- Add document button -->
      <div class="flex shrink-0 items-center gap-2 px-3 py-3">
        <Button
          class="flex-1 bg-primary font-medium text-white hover:bg-primary/90"
          @click="handleAddFolder"
        >
          <FolderPlus class="h-4 w-4" />
          添加文档
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="shrink-0 text-text/50 transition-colors hover:bg-hover hover:text-text"
          title="收起侧边栏"
          @click="settingStore.doToggleSidebar()"
        >
          <PanelLeftClose class="h-6 w-6" />
        </Button>
      </div>

      <!-- Navigation menu -->
      <div class="shrink-0 space-y-0.5 px-2 pt-1.5">
        <div
          class="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 text-base transition-colors text-text hover:bg-active"
          @click="searchStore.doOpenSearchWithHistory()"
        >
          <Search class="h-4 w-4 shrink-0 opacity-60" />
          <span>搜索历史</span>
        </div>
      </div>

      <!-- Divider -->
      <div class="mx-3 my-2 border-t border-border" />

      <!-- Project folders section -->
      <div class="flex h-8 shrink-0 items-center justify-between px-4 text-base font-semibold tracking-wider text-text/60">
        <span>项目</span>
        <div class="flex items-center gap-0.5">
          <button
            class="flex h-5 w-5 items-center justify-center rounded text-text/50 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-20"
            :disabled="!documentStore.selectedNodeId"
            @click="handleCreateMode('folder')"
            title="新建文件夹"
          >
            <FolderPlus class="h-3.5 w-3.5" />
          </button>
          <button
            class="flex h-5 w-5 items-center justify-center rounded text-text/50 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-20"
            :disabled="!documentStore.selectedNodeId"
            @click="handleCreateMode('file')"
            title="新建文件"
          >
            <Plus class="h-3.5 w-3.5" />
          </button>
          <button
            class="flex h-5 w-5 items-center justify-center rounded text-text/50 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-20"
            :disabled="documentStore.expandedDirs.size === 0"
            @click="handleCollapseAll"
            title="收起文件夹"
          >
            <ChevronsUpDown class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Folder tree -->
      <div class="flex-1 overflow-y-auto px-3">
        <DocTree :create-mode="createMode" @cancel-create="handleCancelCreate" />
      </div>

      <!-- 删除确认弹窗 -->
      <ConfirmDialog
        :open="documentStore.pendingRemoveId !== null"
        title="确认移除"
        :description="`确定要移除文件夹「${documentStore.pendingRemoveName}」吗？`"
        show-skip
        @confirm="documentStore.doConfirmRemove()"
        @cancel="documentStore.doCancelRemove()"
      />
    </template>
  </aside>
</template>
