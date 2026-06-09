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

// Only show remove button on root-level folder nodes
const isRoot = computed(() => props.depth === 0 && props.doc.children)

function handleRemove(event: Event) {
  event.stopPropagation()
  documentStore.doRemoveRootFolder(props.doc.id)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-1.5 cursor-pointer text-sm transition-colors group"
      :data-docid="doc.id"
      :style="{
        paddingLeft: (depth * 16 + 16) + 'px',
        backgroundColor: isActive(doc.id) ? 'var(--active-bg)' : 'transparent',
        color: isActive(doc.id) ? 'var(--title)' : 'var(--text)',
        lineHeight: '22px',
      }"
      @click="handleClick(doc)"
      @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)'"
      @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = isActive(doc.id) ? 'var(--active-bg)' : 'transparent'"
    >
      <template v-if="doc.children">
        <ChevronDown v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-3.5 h-3.5 shrink-0" />
        <ChevronRight v-else class="w-3.5 h-3.5 shrink-0" />
        <FolderOpen v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-4 h-4 shrink-0" style="color: #e8a44a;" />
        <Folder v-else class="w-4 h-4 shrink-0" style="color: #e8a44a;" />
      </template>
      <FileText v-else class="w-4 h-4 shrink-0" style="opacity: 0.5;" />
      <span class="truncate">{{ doc.name }}</span>
      <button
        v-if="isRoot"
        class="ml-auto h-5 w-5 flex items-center justify-center rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        @click="handleRemove"
        title="移除文件夹"
      >
        <X class="w-3 h-3" style="opacity: 0.5;" />
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
