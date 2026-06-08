<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import type { TocItem } from '@/types/document'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ListTree, FileText } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const toc = computed(() => documentStore.currentDoc?.toc ?? [])

function scrollToHeading(id: string) {
  const element = document.getElementById(id)
  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDate(ts: number): string {
  if (!ts) return '未知'
  return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
</script>

<template>
  <aside class="flex flex-col overflow-hidden" style="background-color: var(--sidebar); border-left: 1px solid var(--border);">
    <div class="flex items-center px-4 text-xs font-semibold uppercase tracking-wider shrink-0" style="height: 35px; color: var(--text); opacity: 0.7;">
      <ListTree class="w-3.5 h-3.5 mr-1.5" />
      Outline
    </div>
    <Separator />

    <div v-if="documentStore.currentDoc" class="px-4 py-2 shrink-0">
      <div class="flex items-center gap-1.5 mb-1">
        <FileText class="w-3.5 h-3.5 opacity-50" />
        <span class="text-sm font-medium truncate" style="color: var(--title);">{{ documentStore.currentDoc.meta.name }}</span>
      </div>
      <div class="text-xs space-y-0.5" style="color: var(--text); opacity: 0.6;">
        <p>大小: {{ formatSize(documentStore.currentDoc.meta.size) }}</p>
        <p>修改: {{ formatDate(documentStore.currentDoc.meta.modified) }}</p>
        <p>类型: {{ documentStore.currentDoc.meta.type === 'markdown' ? 'Markdown' : '文本' }}</p>
      </div>
    </div>

    <Separator v-if="documentStore.currentDoc" />

    <ScrollArea v-if="toc.length > 0" class="flex-1">
      <div class="py-1">
        <template v-for="item in toc" :key="item.id">
          <TocNodeComponent :item="item" @navigate="scrollToHeading" />
        </template>
      </div>
    </ScrollArea>

    <div v-if="!documentStore.currentDoc" class="flex-1 flex items-center justify-center p-4">
      <span class="text-xs" style="color: var(--text); opacity: 0.3;">打开文档以查看目录</span>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

export const TocNodeComponent = defineComponent({
  name: 'TocNodeComponent',
  props: {
    item: { type: Object as PropType<TocItem>, required: true },
  },
  emits: ['navigate'],
  template: `
    <div
      class="cursor-pointer text-sm py-0.5 hover:opacity-80 transition-opacity"
      :style="{
        paddingLeft: (item.level * 12 + 8) + 'px',
        color: 'var(--text)',
        opacity: item.level <= 2 ? 0.85 : 0.6,
      }"
      @click="$emit('navigate', item.id)"
    >
      {{ item.text }}
      <template v-if="item.children">
        <TocNodeComponent v-for="child in item.children" :key="child.id" :item="child" @navigate="$emit('navigate', $event)" />
      </template>
    </div>
  `
})
</script>
