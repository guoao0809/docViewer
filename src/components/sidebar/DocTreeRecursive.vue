<script setup lang="ts">
import { computed } from 'vue'
import type { DocMeta } from '@/types/document'
import { useDocumentStore } from '@/stores/documentStore'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, X } from 'lucide-vue-next'

const props = defineProps<{
  doc: DocMeta
  depth: number
  shouldAutoExpand: boolean
}>()

const documentStore = useDocumentStore()

function isExpanded(id: string) { return documentStore.expandedDirs.has(id) }
function isActive(id: string) { return documentStore.currentDoc?.meta.id === id }

function handleClick(doc: DocMeta) {
  if (doc.children) {
    documentStore.doToggleExpanded(doc.id)
  } else {
    documentStore.doOpenDoc(doc)
  }
}

const isRoot = computed(() => props.depth === 0 && props.doc.children)

function handleRemove(event: Event) {
  event.stopPropagation()
  documentStore.doRemoveRootFolder(props.doc.id)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-1.5 cursor-pointer text-sm transition-colors rounded-md group"
      :data-docid="doc.id"
      :class="{
        'bg-active text-title': isActive(doc.id),
        'text-text hover:bg-hover': !isActive(doc.id),
      }"
      :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
      @click="handleClick(doc)"
    >
      <template v-if="doc.children">
        <ChevronDown v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-3.5 h-3.5 shrink-0 text-text/40" />
        <ChevronRight v-else class="w-3.5 h-3.5 shrink-0 text-text/40" />
        <FolderOpen v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-4 h-4 shrink-0 text-amber-500" />
        <Folder v-else class="w-4 h-4 shrink-0 text-amber-500" />
      </template>
      <FileText v-else class="w-4 h-4 shrink-0 text-text/50" />
      <span class="truncate">{{ doc.name }}</span>
      <button
        v-if="isRoot"
        class="ml-auto h-5 w-5 flex items-center justify-center rounded hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        @click="handleRemove"
        title="移除文件夹"
      >
        <X class="w-3 h-3 text-text/50" />
      </button>
    </div>
    <template v-if="doc.children && (isExpanded(doc.id) || shouldAutoExpand)">
      <DocTreeRecursive
        v-for="child in doc.children"
        :key="child.id"
        :doc="child"
        :depth="depth + 1"
        :should-auto-expand="shouldAutoExpand"
      />
    </template>
  </div>
</template>
