<script setup lang="ts">
import { watch, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog } from '@/services/tauriService'
import { FileText, Edit3, Copy, MoreHorizontal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

/** Walk text nodes and highlight matching terms */
function highlightText(container: HTMLElement, matchText: string) {
  const terms = matchText.split(/\s+/).filter(t => t.length > 1).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (terms.length === 0) return
  const regex = new RegExp(`(${terms.join('|')})`, 'gi')
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest('pre, code, mark')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  for (const node of textNodes) {
    const text = node.textContent ?? ''
    if (!regex.test(text)) continue
    regex.lastIndex = 0
    const frag = document.createDocumentFragment()
    let lastIdx = 0; let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      const mark = document.createElement('mark')
      mark.style.cssText = 'background-color: #fde047; color: #000; border-radius: 2px; padding: 0 1px;'
      mark.textContent = match[0]
      frag.appendChild(mark)
      lastIdx = regex.lastIndex
    }
    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)))
    node.parentNode?.replaceChild(frag, node)
  }
}

function clearHighlights(container: HTMLElement) {
  container.querySelectorAll('mark').forEach(mark => {
    mark.parentNode?.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
    mark.parentNode?.normalize()
  })
}

function scrollToFirstMatch() {
  const firstMark = document.querySelector('.markdown-content mark')
  if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(() => searchStore.highlightTarget, async (target) => {
  if (!target || target.docId !== documentStore.currentDoc?.meta.id) return
  await nextTick()
  const container = document.querySelector('.markdown-content') as HTMLElement | null
  if (!container) return
  clearHighlights(container)
  highlightText(container, target.matchText)
  scrollToFirstMatch()
})

function handleContentClick() {
  searchStore.doClearHighlight()
}
</script>

<template>
  <!-- Empty state -->
  <div v-if="!documentStore.currentDoc" class="h-full flex flex-col items-center justify-center bg-bg">
    <FileText class="w-16 h-16 mb-4 text-text/15" />
    <p class="text-lg mb-2 text-title/50">打开一个文档</p>
    <p class="text-sm mb-5 text-text/30">从左侧文件夹或中间文档列表选择</p>
    <Button class="bg-primary text-white hover:bg-primary/90" @click="handleOpenFolder">
      选择文件夹
    </Button>
  </div>

  <!-- Content -->
  <div v-else class="h-full flex flex-col bg-bg">
    <!-- Title bar -->
    <div class="flex items-center gap-3 px-6 h-12 shrink-0 border-b border-border">
      <span class="text-lg font-semibold truncate flex-1 text-title">
        {{ documentStore.currentDoc.meta.name }}
      </span>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="编辑">
        <Edit3 class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="复制">
        <Copy class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="更多">
        <MoreHorizontal class="w-4 h-4" />
      </Button>
    </div>

    <!-- Content scroll -->
    <div class="flex-1 overflow-y-auto" @click="handleContentClick">
      <div class="markdown-content" v-html="documentStore.currentDoc.html" />
    </div>
  </div>
</template>
