<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import type { DocMeta } from '@/types/document'
import { useDocumentStore } from '@/stores/documentStore'
import { ChevronRight, ChevronDown, Folder, FolderOpen, X } from 'lucide-vue-next'

const props = defineProps<{
  doc: DocMeta
  depth: number
  shouldAutoExpand: boolean
  createMode: 'file' | 'folder' | null
}>()

const emit = defineEmits<{
  cancelCreate: []
}>()

const documentStore = useDocumentStore()

const newName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const isCreating = computed(() => {
  if (!props.createMode) return false
  // 文件夹被选中 → 在其下创建
  if (documentStore.selectedNodeId === props.doc.id && props.doc.children) return true
  // 文件被选中 → 在其父文件夹下创建
  if (props.doc.children) {
    return props.doc.children.some(c => c.id === documentStore.selectedNodeId && !c.children)
  }
  return false
})

function isExpanded(id: string) { return documentStore.expandedDirs.has(id) }
function isActive(id: string) { return documentStore.currentDoc?.meta.id === id }
function isSelected(id: string) { return documentStore.selectedNodeId === id }

function handleClick(doc: DocMeta) {
  documentStore.doSelectNode(doc.id)
  if (doc.children) {
    documentStore.doToggleExpanded(doc.id)
  } else {
    documentStore.doOpenDoc(doc)
  }
}

const isRoot = computed(() => props.depth === 0 && props.doc.children)

function handleRemove(event: Event) {
  event.stopPropagation()
  documentStore.doRequestRemove(props.doc.id, props.doc.name)
}

function getCreateTargetPath(): string {
  if (props.doc.children) return props.doc.path
  const p = props.doc.path.replaceAll('\\', '/')
  const lastSep = p.lastIndexOf('/')
  return lastSep > 0 ? p.substring(0, lastSep) : p
}

async function handleCreate() {
  const name = newName.value.trim()
  if (!name) return

  if (props.createMode === 'file') {
    await documentStore.doCreateFile(getCreateTargetPath(), name)
  } else if (props.createMode === 'folder') {
    await documentStore.doCreateFolder(getCreateTargetPath(), name)
  }
  await documentStore.doRefreshChildren(props.doc.id)
  emit('cancelCreate')
}

function handleCancel() {
  emit('cancelCreate')
}

watch(isCreating, async (val) => {
  if (val) {
    newName.value = ''
    await nextTick()
    inputRef.value?.focus()
  }
})

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
      class="flex items-center gap-2.5 cursor-pointer text-base transition-colors rounded-md group mb-0.5"
      :data-docid="doc.id"
      :class="{
        'bg-active text-title': isActive(doc.id),
        'bg-hover':isSelected(doc.id) && !isActive(doc.id),
        'text-text hover:bg-hover': !isActive(doc.id),
        // 'ring-1 ring-primary/40': isSelected(doc.id) && !isActive(doc.id),
      }"
      :style="{ paddingLeft: (depth * 20 + 8) + 'px' }"
      @click="handleClick(doc)"
    >
      <template v-if="doc.children">
        <ChevronDown v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-3.5 h-3.5 shrink-0 text-text/40" />
        <ChevronRight v-else class="w-3.5 h-3.5 shrink-0 text-text/40" />
        <FolderOpen v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-5 h-5 shrink-0 text-amber-500 fill-current" />
        <Folder v-else class="w-5 h-5 shrink-0 text-amber-500 fill-current" />
        <span class="truncate text-[16px] font-medium">
          {{ doc.name }}
          <span class="text-[13px] text-text/50">({{ countDocs(doc) }})</span>
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
        <div class="w-3.5 h-3.5 shrink-0" />
        <div
          class="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          :class="getFileTypeBadge(doc.name).bgColor"
        >
          {{ getFileTypeBadge(doc.name).letter }}
        </div>
        <span class="truncate">{{ doc.name }}</span>
      </template>
    </div>

    <!-- 子节点 -->
    <template v-if="doc.children && (isExpanded(doc.id) || shouldAutoExpand)">
      <DocTreeRecursive
        v-for="child in doc.children"
        :key="child.id"
        :doc="child"
        :depth="depth + 1"
        :should-auto-expand="shouldAutoExpand"
        :create-mode="createMode"
        @cancel-create="emit('cancelCreate')"
      />
    </template>

    <!-- 内联输入：在选中节点下创建新文件/文件夹 -->
    <template v-if="isCreating && doc.children">
      <div
        class="flex items-center gap-2 py-1"
        :style="{ paddingLeft: ((depth + 1) * 20 + 8) + 'px' }"
      >
        <div class="w-5 h-5 rounded-md border border-dashed border-primary/50 flex items-center justify-center shrink-0">
          <span class="text-[10px] text-primary/50">
            {{ createMode === 'file' ? 'F' : 'D' }}
          </span>
        </div>
        <input
          ref="inputRef"
          v-model="newName"
          type="text"
          class="flex-1 bg-transparent border-b border-primary text-sm text-text outline-none px-1"
          :placeholder="createMode === 'file' ? '文件名.md' : '文件夹名'"
          @keydown.enter.prevent="handleCreate"
          @keydown.escape="handleCancel"
          @blur="handleCancel"
        />
      </div>
    </template>
  </div>
</template>
