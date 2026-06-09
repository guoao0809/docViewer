<script setup lang="ts">
import { ref } from 'vue'
import DocTree from '@/components/sidebar/DocTree.vue'
import FavoritesList from '@/components/sidebar/FavoritesList.vue'
import RecentList from '@/components/sidebar/RecentList.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { Search, FolderPlus, ChevronDown, ChevronRight } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const searchFilter = ref('')
const collapsedSections = ref<Set<string>>(new Set())

function toggleSection(section: string) {
  if (collapsedSections.value.has(section)) {
    collapsedSections.value.delete(section)
  } else {
    collapsedSections.value.add(section)
  }
  collapsedSections.value = new Set(collapsedSections.value)
}

function isCollapsed(section: string) {
  return collapsedSections.value.has(section)
}

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}
</script>

<template>
  <aside
    class="flex flex-col overflow-hidden select-none"
    style="background-color: var(--sidebar);"
  >
    <!-- 顶部: 搜索过滤 -->
    <div class="px-3 py-2 shrink-0" style="border-bottom: 1px solid var(--border);">
      <div
        class="flex items-center gap-2 h-7 px-3 rounded text-xs"
        style="background-color: var(--bg); border: 1px solid var(--border); color: var(--text);"
      >
        <Search class="w-3.5 h-3.5 shrink-0" style="opacity: 0.4;" />
        <input
          v-model="searchFilter"
          type="text"
          placeholder="过滤文件..."
          class="flex-1 bg-transparent border-none outline-none text-xs"
          style="color: var(--text);"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="documentStore.rootPaths.length === 0" class="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div
        class="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
        style="background-color: var(--panel);"
      >
        <FolderPlus class="w-5 h-5" style="color: var(--primary);" />
      </div>
      <p class="text-sm mb-1" style="color: var(--title); opacity: 0.7;">尚未打开文件夹</p>
      <p class="text-xs mb-4" style="color: var(--text); opacity: 0.4;">选择包含 Markdown 文档的文件夹</p>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors"
        style="background-color: var(--primary); color: #fff;"
        @click="handleOpenFolder"
      >
        <FolderPlus class="w-4 h-4" />
        选择文件夹
      </button>
    </div>

    <!-- 已打开文件夹 -->
    <div v-else class="flex-1 overflow-y-auto">
      <!-- Favorites 分区 -->
      <FavoritesList />

      <!-- Recent 分区 -->
      <RecentList />

      <!-- Documents 分区 — 可折叠 -->
      <div style="border-top: 1px solid var(--border);">
        <div
          class="flex items-center gap-1 px-4 h-7 cursor-pointer text-xs font-semibold uppercase tracking-wider"
          style="color: var(--text); opacity: 0.7;"
          @click="toggleSection('documents')"
        >
          <ChevronDown v-if="!isCollapsed('documents')" class="w-3.5 h-3.5 shrink-0" />
          <ChevronRight v-else class="w-3.5 h-3.5 shrink-0" />
          <span>Documents</span>
          <button
            class="ml-auto h-5 w-5 flex items-center justify-center rounded hover:bg-white/5"
            @click.stop="handleOpenFolder"
            title="添加文件夹"
          >
            <FolderPlus class="w-3 h-3" />
          </button>
        </div>
        <DocTree v-show="!isCollapsed('documents')" :filter="searchFilter" />
      </div>
    </div>
  </aside>
</template>