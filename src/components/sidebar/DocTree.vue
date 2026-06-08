<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import type { DocMeta } from '@/types/document'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-vue-next'

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

function handleContextMenu(event: MouseEvent, doc: DocMeta) {
  event.preventDefault()
}
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div class="flex items-center px-4 text-xs font-semibold uppercase tracking-wider" style="height: 30px; color: var(--text); opacity: 0.7;">
      Documents
    </div>
    <div v-if="documentStore.docTree.length === 0" class="px-4 py-3 text-xs" style="color: var(--text); opacity: 0.4;">
      未找到支持的文档文件
    </div>

    <!-- Tree nodes rendered inline with recursive template -->
    <template v-for="doc in documentStore.docTree" :key="doc.id">
      <div>
        <div
          class="flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm"
          :style="{ paddingLeft: '8px', backgroundColor: isActive(doc.id) ? 'var(--active-bg)' : 'transparent', color: isActive(doc.id) ? 'var(--title)' : 'var(--text)' }"
          @click="handleClick(doc)"
          @contextmenu="handleContextMenu($event, doc)"
        >
          <template v-if="doc.children">
            <ChevronRight v-if="!isExpanded(doc.id)" class="w-3.5 h-3.5 shrink-0" />
            <ChevronDown v-else class="w-3.5 h-3.5 shrink-0" />
            <Folder v-if="!isExpanded(doc.id)" class="w-4 h-4 shrink-0 text-yellow-400" />
            <FolderOpen v-else class="w-4 h-4 shrink-0 text-yellow-500" />
          </template>
          <FileText v-else class="w-4 h-4 shrink-0 opacity-60" />
          <span class="truncate">{{ doc.name }}</span>
        </div>

        <!-- Recursive children -->
        <template v-if="doc.children && isExpanded(doc.id)">
          <template v-for="child in doc.children" :key="child.id">
            <DocTreeItem
              :doc="child"
              :depth="1"
              :expanded="isExpanded(child.id)"
              :active="isActive(child.id)"
              @click="handleClick(child)"
              @contextmenu="handleContextMenu($event, child)"
            />
          </template>
        </template>
      </div>
    </template>
  </div>
</template>

<!-- Recursive tree item component -->
<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export const DocTreeItem = defineComponent({
  name: 'DocTreeItem',
  props: {
    doc: { type: Object as PropType<DocMeta>, required: true },
    depth: { type: Number, required: true },
    expanded: { type: Boolean, required: true },
    active: { type: Boolean, required: true },
  },
  components: { ChevronRight, ChevronDown, FileText, Folder, FolderOpen },
  emits: ['click', 'contextmenu'],
  template: `
    <div>
      <div
        class="flex items-center gap-1 px-2 py-0.5 cursor-pointer text-sm"
        :style="{
          paddingLeft: (depth * 16 + 8) + 'px',
          backgroundColor: active ? 'var(--active-bg)' : 'transparent',
          color: active ? 'var(--title)' : 'var(--text)',
        }"
        @click="$emit('click')"
        @contextmenu="$emit('contextmenu', $event)"
      >
        <template v-if="doc.children">
          <component :is="expanded ? ChevronDown : ChevronRight" class="w-3.5 h-3.5 shrink-0" />
          <component :is="expanded ? FolderOpen : Folder" class="w-4 h-4 shrink-0" :class="expanded ? 'text-yellow-500' : 'text-yellow-400'" />
        </template>
        <FileText v-else class="w-4 h-4 shrink-0 opacity-60" />
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
          v-bind="$attrs"
        />
      </template>
    </div>
  `
})
</script>
