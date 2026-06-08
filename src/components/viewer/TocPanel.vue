<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import type { TocItem } from '@/types/document'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ListTree, FileText, Info, Star } from 'lucide-vue-next'

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

const docInfo = computed(() => {
  if (!documentStore.currentDoc) return null
  const meta = documentStore.currentDoc.meta
  return {
    name: meta.name,
    size: formatSize(meta.size),
    modified: formatDate(meta.modified),
    type: meta.type === 'markdown' ? 'Markdown' : '文本',
    favorite: meta.favorite,
    lines: documentStore.currentDoc.raw.split('\n').length,
  }
})
</script>

<template>
  <aside class="flex flex-col overflow-hidden" style="background-color: var(--sidebar); border-left: 1px solid var(--border);">
    <!-- Outline 标题 -->
    <div
      class="flex items-center gap-1.5 px-4 h-7 text-xs font-semibold uppercase tracking-wider shrink-0"
      style="color: var(--text); opacity: 0.7;"
    >
      <ListTree class="w-3.5 h-3.5" />
      <span>Outline</span>
    </div>
    <div style="height: 1px; background-color: var(--border);" class="shrink-0"></div>

    <!-- 文档信息分区 -->
    <div v-if="docInfo" class="px-4 py-2.5 shrink-0" style="border-bottom: 1px solid var(--border);">
      <div class="flex items-center gap-2 mb-1.5">
        <FileText class="w-4 h-4 shrink-0" style="color: var(--primary);" />
        <span class="text-sm font-medium truncate" style="color: var(--title);">{{ docInfo.name }}</span>
        <button
          class="ml-auto shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-white/5 transition-colors"
          :style="{ color: docInfo.favorite ? 'var(--primary)' : 'var(--text)', opacity: docInfo.favorite ? 1 : 0.4 }"
          @click="documentStore.doToggleFavorite(documentStore.currentDoc!.meta.id)"
          title="收藏"
        >
          <Star class="w-3.5 h-3.5" :class="docInfo.favorite ? 'fill-current' : ''" />
        </button>
      </div>
      <div class="text-xs space-y-1" style="color: var(--text); opacity: 0.5;">
        <div class="flex items-center gap-2">
          <Info class="w-3 h-3 shrink-0" />
          <span>{{ docInfo.size }} · {{ docInfo.lines }} 行 · {{ docInfo.type }}</span>
        </div>
        <p>修改: {{ docInfo.modified }}</p>
      </div>
    </div>

    <!-- TOC 目录 -->
    <div v-if="toc.length > 0" class="flex-1 overflow-y-auto">
      <div class="py-1">
        <template v-for="item in toc" :key="item.id">
          <TocNodeComponent :item="item" @navigate="scrollToHeading" />
        </template>
      </div>
    </div>

    <!-- 无文档提示 -->
    <div v-else-if="!documentStore.currentDoc" class="flex-1 flex items-center justify-center p-4">
      <span class="text-xs" style="color: var(--text); opacity: 0.3;">打开文档以查看目录</span>
    </div>

    <!-- 有文档但无 TOC -->
    <div v-else class="flex-1 flex items-center justify-center p-4">
      <span class="text-xs" style="color: var(--text); opacity: 0.3;">此文档无标题结构</span>
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
      class="cursor-pointer text-sm py-0.5 transition-colors rounded-sm"
      :class="item.level <= 2 ? 'font-medium' : ''"
      :style="{
        paddingLeft: (item.level * 12 + 12) + 'px',
        color: 'var(--text)',
        opacity: item.level <= 2 ? 0.9 : 0.5,
      }"
      @click="$emit('navigate', item.id)"
      @mouseenter="$event.target.style.backgroundColor = 'var(--hover-bg)'"
      @mouseleave="$event.target.style.backgroundColor = 'transparent'"
    >
      {{ item.text }}
      <template v-if="item.children">
        <TocNodeComponent v-for="child in item.children" :key="child.id" :item="child" @navigate="$emit('navigate', $event)" />
      </template>
    </div>
  `
})
</script>