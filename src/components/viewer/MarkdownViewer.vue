<script setup lang="ts">
import { watch, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { FileText } from 'lucide-vue-next'
import { openFileDialog } from '@/services/tauriService'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

/** Walk text nodes in a DOM subtree, find and highlight matching text */
function highlightText(container: HTMLElement, matchText: string) {
  // Split matchText into individual terms
  const terms = matchText
    .split(/\s+/)
    .filter(t => t.length > 1)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escape regex

  if (terms.length === 0) return

  const regex = new RegExp(`(${terms.join('|')})`, 'gi')

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip nodes inside code blocks, pre elements, and existing marks
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        if (parent.closest('pre, code, mark')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    },
  )

  const textNodes: Text[] = []
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text)
  }

  for (const node of textNodes) {
    const text = node.textContent ?? ''
    if (!regex.test(text)) continue
    regex.lastIndex = 0 // reset after test

    const frag = document.createDocumentFragment()
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      }
      const mark = document.createElement('mark')
      mark.style.cssText = 'background-color: #fde047; color: #000; border-radius: 2px; padding: 0 1px;'
      mark.textContent = match[0]
      frag.appendChild(mark)
      lastIdx = regex.lastIndex
    }

    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)))
    }

    node.parentNode?.replaceChild(frag, node)
  }
}

/** Scroll the first <mark> element into view */
function scrollToFirstMatch() {
  const firstMark = document.querySelector('.markdown-content mark')
  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

/** Remove all <mark> elements, restoring plain text */
function clearHighlights(container: HTMLElement) {
  const marks = container.querySelectorAll('mark')
  marks.forEach(mark => {
    const parent = mark.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
      parent.normalize() // merge adjacent text nodes
    }
  })
}

// Watch for highlight target changes
watch(() => searchStore.highlightTarget, async (target) => {
  if (!target) return
  if (target.docId !== documentStore.currentDoc?.meta.id) return

  await nextTick()

  const container = document.querySelector('.markdown-content') as HTMLElement | null
  if (!container) return

  // Clear any existing highlights first
  clearHighlights(container)

  // Highlight and scroll
  highlightText(container, target.matchText)
  scrollToFirstMatch()
})

// Clear highlights when user clicks on the document
function handleContentClick() {
  searchStore.doClearHighlight()
}
</script>

<template>
  <!-- Empty state: no document loaded -->
  <div v-if="!documentStore.currentDoc" class="h-full flex flex-col items-center justify-center" style="background-color: var(--bg);">
    <FileText class="w-16 h-16 mb-4" style="color: var(--text); opacity: 0.15;" />
    <p class="text-lg mb-2" style="color: var(--title); opacity: 0.6;">打开一个 Markdown 文档</p>
    <p class="text-sm mb-5" style="color: var(--text); opacity: 0.3;">从左侧目录选择文件，或使用 Ctrl+K 搜索</p>
    <button
      class="flex items-center gap-2 px-4 py-2 rounded text-sm transition-colors"
      style="background-color: var(--primary); color: #fff;"
      @click="handleOpenFolder"
    >
      打开文件夹
    </button>
  </div>

  <!-- Document content -->
  <div
    v-else
    class="h-full overflow-y-auto"
    style="background-color: var(--bg);"
    @click="handleContentClick"
  >
    <div class="markdown-content" v-html="documentStore.currentDoc.html" />
  </div>
</template>
