<script setup lang="ts">
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import type { DocMeta } from '@/types/document'

const documentStore = useDocumentStore()
const tabStore = useTabStore()

function isExpanded(id: string) { return documentStore.expandedDirs.has(id) }
function isActive(id: string) { return documentStore.currentDoc?.meta.id === id }

function handleClick(doc: DocMeta) {
  if (doc.children) {
    documentStore.doToggleExpanded(doc.id)
  } else {
    tabStore.doOpenTab(doc.id, doc.name)
    documentStore.doLoadDocument(doc.id)
  }
}
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div v-if="documentStore.docTree.length === 0" class="px-4 py-3 text-xs" style="color: var(--text); opacity: 0.4;">
      未找到支持的文档文件
    </div>

    <template v-for="doc in documentStore.docTree" :key="doc.id">
      <DocTreeItem
        :doc="doc"
        :depth="0"
        :expanded="isExpanded(doc.id)"
        :active="isActive(doc.id)"
        @click="handleClick(doc)"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-vue-next'

const DocTreeItem = defineComponent({
  name: 'DocTreeItem',
  props: {
    doc: { type: Object as PropType<DocMeta>, required: true },
    depth: { type: Number, required: true },
    expanded: { type: Boolean, required: true },
    active: { type: Boolean, required: true },
  },
  components: { ChevronRight, ChevronDown, FileText, Folder, FolderOpen },
  emits: ['click'],
  template: `
    <div>
      <div
        class="flex items-center gap-1.5 cursor-pointer text-sm transition-colors"
        :data-docid="doc.id"
        :style="{
          paddingLeft: (depth * 16 + 16) + 'px',
          backgroundColor: active ? 'var(--active-bg)' : 'transparent',
          color: active ? 'var(--title)' : 'var(--text)',
          lineHeight: '22px',
        }"
        @click="$emit('click')"
        @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor = 'var(--hover-bg)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = active ? 'var(--active-bg)' : 'transparent'"
      >
        <template v-if="doc.children">
          <component :is="expanded ? 'ChevronDown' : 'ChevronRight'" class="w-3.5 h-3.5 shrink-0" />
          <component :is="expanded ? 'FolderOpen' : 'Folder'" class="w-4 h-4 shrink-0" style="color: #e8a44a;" />
        </template>
        <FileText v-else class="w-4 h-4 shrink-0" style="opacity: 0.5;" />
        <span class="truncate">{{ doc.name }}</span>
      </div>
      <template v-if="doc.children && expanded">
        <DocTreeItem
          v-for="child in doc.children"
          :key="child.id"
          :doc="child"
          :depth="depth + 1"
          :expanded="false"
          :active="false"
          @click="$emit('click')"
        />
      </template>
    </div>
  `
})

export default DocTreeItem
export { DocTreeItem }
</script>