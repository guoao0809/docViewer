<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import type { DocMeta } from '@/types/document'
import DocTreeRecursive from './DocTreeRecursive.vue'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const props = defineProps<{
  filter?: string
  createMode: 'file' | 'folder' | null
}>()

const emit = defineEmits<{
  cancelCreate: []
}>()

const documentStore = useDocumentStore()

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

const shouldAutoExpand = computed(() => !!props.filter && props.filter.length > 0)

const menuItems = computed(() => {
  const id = documentStore.contextMenu.nodeId
  if (!id) return []
  return [
    { key: 'copy-path', label: '复制文件路径', action: () => documentStore.doCopyPath(id) },
    { key: 'reveal', label: '在文件资源管理器中显示', action: () => documentStore.doRevealInExplorer(id) },
    { key: 'rename', label: '重命名', action: () => documentStore.doStartRename(id) },
    { key: 'delete', label: '删除', danger: true, action: () => documentStore.doRequestTrash(id) },
  ]
})
</script>

<template>
  <div class="flex-1 overflow-y-auto">
    <div v-if="filteredTree.length === 0" class="px-4 py-3 text-sm text-text/40">
      {{ props.filter ? '未找到匹配的文件' : '未找到支持的文档文件' }}
    </div>

    <DocTreeRecursive
      v-for="doc in filteredTree"
      :key="doc.id"
      :doc="doc"
      :depth="0"
      :should-auto-expand="shouldAutoExpand"
      :create-mode="props.createMode"
      @cancel-create="emit('cancelCreate')"
    />

    <!-- 节点右键菜单 -->
    <ContextMenu
      v-if="documentStore.contextMenu.visible"
      :x="documentStore.contextMenu.x"
      :y="documentStore.contextMenu.y"
      :items="menuItems"
      @close="documentStore.doCloseContextMenu()"
    />

    <!-- 删除确认 -->
    <ConfirmDialog
      :open="documentStore.pendingTrashId !== null"
      title="确认删除"
      :description="`确定要把「${documentStore.pendingTrashName}」移入回收站吗？`"
      @confirm="documentStore.doConfirmTrash()"
      @cancel="documentStore.doCancelTrash()"
    />
  </div>
</template>
