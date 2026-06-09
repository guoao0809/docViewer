<script setup lang="ts">
import { computed } from 'vue'
import type { DocMeta } from '@/types/document'
import { useDocumentStore } from '@/stores/documentStore'
import { ChevronRight, ChevronDown, Folder, FolderOpen, X } from 'lucide-vue-next'

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

interface FileTypeBadge {
  letter: string
  bgColor: string
}

function getFileTypeBadge(name: string): FileTypeBadge {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'md':
    case 'markdown':
      return { letter: 'M↓', bgColor: 'bg-blue-500' }
    case 'json':
      return { letter: 'J', bgColor: 'bg-yellow-500' }
    case 'pdf':
      return { letter: 'PDF', bgColor: 'bg-red-500' }
    case 'sketch':
      return { letter: 'SK', bgColor: 'bg-gray-400' }
    default:
      return { letter: ext.slice(0, 3).toUpperCase(), bgColor: 'bg-green-500' }
  }
}

function countDocs(doc: DocMeta): number {
  if (!doc.children) return 1
  return doc.children.reduce((sum, child) => sum + countDocs(child), 0)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2.5 cursor-pointer text-base transition-colors rounded-md group mb-2"
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
        <FolderOpen v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-5 h-5 shrink-0 text-amber-500 fill-current" />
        <Folder v-else class="w-5 h-5 shrink-0 text-amber-500 fill-current" />
        <span class="truncate text-[20px] font-semibold">
          {{ doc.name }}
          <span class="text-[14px]">({{ countDocs(doc) }})</span>
        </span>
        <button
          v-if="isRoot"
          class="ml-auto h-5 w-5 flex items-center justify-center rounded hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          @click="handleRemove"
          title="移除文件夹"
        >
          <X class="w-3 h-3 text-text/50" />
        </button>
      </template>
      <template v-else>
        <div
          class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 ml-7"
          :class="getFileTypeBadge(doc.name).bgColor"
        >
          {{ getFileTypeBadge(doc.name).letter }}
        </div>
        <span class="truncate">{{ doc.name }}</span>
      </template>
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
