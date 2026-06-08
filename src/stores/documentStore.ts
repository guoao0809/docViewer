import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocMeta, DocContent } from '@/types/document'
import { scanDirectory, readDocument, getFileMetadata } from '@/services/tauriService'
import { parseMarkdown } from '@/services/markdownService'

export const useDocumentStore = defineStore('document', () => {
  const docTree = ref<DocMeta[]>([])
  const currentDoc = ref<DocContent | null>(null)
  const expandedDirs = ref<Set<string>>(new Set())
  const rootPath = ref('')
  const isLoading = ref(false)

  async function doScanDirectory(path: string) {
    isLoading.value = true
    rootPath.value = path
    try {
      const tree = await scanDirectory(path)
      docTree.value = tree
    } finally {
      isLoading.value = false
    }
  }

  async function doLoadDocument(id: string) {
    isLoading.value = true
    try {
      const meta = findDocById(id, docTree.value)
      if (!meta) throw new Error(`Document not found: ${id}`)
      const raw = await readDocument(id)
      try {
        const fileMeta = await getFileMetadata(id)
        meta.size = fileMeta.size
        meta.modified = fileMeta.modified
      } catch { /* ignore */ }
      meta.lastOpen = Date.now()
      meta.visitCount++
      const content = parseMarkdown(raw, meta)
      currentDoc.value = content
    } finally {
      isLoading.value = false
    }
  }

  function findDocById(id: string, docs: DocMeta[]): DocMeta | null {
    for (const doc of docs) {
      if (doc.id === id) return doc
      if (doc.children) {
        const found = findDocById(id, doc.children)
        if (found) return found
      }
    }
    return null
  }

  function doToggleFavorite(id: string) {
    const toggleIn = (docs: DocMeta[]): boolean => {
      for (const doc of docs) {
        if (doc.id === id) {
          doc.favorite = !doc.favorite
          return true
        }
        if (doc.children && toggleIn(doc.children)) return true
      }
      return false
    }
    toggleIn(docTree.value)
    if (currentDoc.value && currentDoc.value.meta.id === id) {
      currentDoc.value.meta.favorite = !currentDoc.value.meta.favorite
    }
  }

  function doToggleExpanded(id: string) {
    if (expandedDirs.value.has(id)) {
      expandedDirs.value.delete(id)
    } else {
      expandedDirs.value.add(id)
    }
    expandedDirs.value = new Set(expandedDirs.value)
  }

  return {
    docTree, currentDoc, expandedDirs, rootPath, isLoading,
    doScanDirectory, doLoadDocument, doToggleFavorite, doToggleExpanded,
  }
})
