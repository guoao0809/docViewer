<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import type { DocMeta } from '@/types/document'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-vue-next'

const props = defineProps<{
  filter?: string
}>()

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

/** Filter tree: keep entries whose name matches, or whose children contain matches. */
function filterTree(docs: DocMeta[], query: string): DocMeta[] {
  if (!query) return docs
  const lower = query.toLowerCase()
  const result: DocMeta[] = []
  for (const doc of docs) {
    if (doc.children) {
      const filteredChildren = filterTree(doc.children, query)
      if (filteredChildren.length > 0 || doc.name.toLowerCase().includes(lower)) {
        result.push({ ...doc, children: filteredChildren.length > 0 ? filteredChildren : doc.children })
      }
    } else {
      if (doc.name.toLowerCase().includes(lower)) {
        result.push(doc)
      }
    }
  }
  return result
}

const filteredTree = computed(() => filterTree(documentStore.docTree, props.filter ?? ''))

/** When filter is active, auto-expand all folders so matches are visible */
const shouldAutoExpand = computed(() => !!props.filter && props.filter.length > 0)
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div v-if="filteredTree.length === 0" class="px-4 py-3 text-xs" style="color: var(--text); opacity: 0.4;">
      {{ props.filter ? '未找到匹配的文件' : '未找到支持的文档文件' }}
    </div>

    <DocTreeRecursive
      v-for="doc in filteredTree"
      :key="doc.id"
      :doc="doc"
      :depth="0"
      :should-auto-expand="shouldAutoExpand"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

const DocTreeRecursive = defineComponent({
  name: 'DocTreeRecursive',
  props: {
    doc: { type: Object as PropType<DocMeta>, required: true },
    depth: { type: Number, required: true },
    shouldAutoExpand: { type: Boolean, default: false },
  },
  components: { ChevronRight, ChevronDown, FileText, Folder, FolderOpen },
  setup() {
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

    return { isExpanded, isActive, handleClick }
  },
  template: `
    <div>
      <div
        class="flex items-center gap-1.5 cursor-pointer text-sm transition-colors"
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
  `,
})

export default defineComponent({
  name: 'DocTree',
  components: { DocTreeRecursive },
})

export { DocTreeRecursive }
</script>