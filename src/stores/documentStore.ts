import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { DocMeta, DocContent } from '@/types/document'
import { scanDirectory, readDocument, getFileMetadata } from '@/services/tauriService'
import { parseMarkdown } from '@/services/markdownService'
import { useSearchStore } from './searchStore'

const STORAGE_KEY = 'docviewer-state'

interface PersistedDocMeta {
  id: string
  favorite: boolean
  lastOpen: number | null
  visitCount: number
}

function serializeDocTree(docs: DocMeta[]): PersistedDocMeta[] {
  const result: PersistedDocMeta[] = []
  for (const doc of docs) {
    result.push({ id: doc.id, favorite: doc.favorite, lastOpen: doc.lastOpen, visitCount: doc.visitCount })
    if (doc.children) result.push(...serializeDocTree(doc.children))
  }
  return result
}

function mergePersistedIntoTree(docs: DocMeta[], persisted: Map<string, PersistedDocMeta>): void {
  for (const doc of docs) {
    const p = persisted.get(doc.id)
    if (p) {
      doc.favorite = p.favorite
      doc.lastOpen = p.lastOpen
      doc.visitCount = p.visitCount
    }
    if (doc.children) mergePersistedIntoTree(doc.children, persisted)
  }
}

export const useDocumentStore = defineStore('document', () => {
  const docTree = ref<DocMeta[]>([])
  const currentDoc = ref<DocContent | null>(null)
  const expandedDirs = ref<Set<string>>(new Set())
  const rootPaths = ref<string[]>([])
  const isLoading = ref(false)

  function persistState() {
    const state = {
      rootPaths: rootPaths.value,
      expandedDirs: Array.from(expandedDirs.value),
      docMeta: serializeDocTree(docTree.value),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const state = JSON.parse(raw)
      if (state.rootPaths) {
        rootPaths.value = state.rootPaths as string[]
      } else if (state.rootPath) {
        // Migrate from old single-path format
        rootPaths.value = [state.rootPath as string]
      }
      if (state.expandedDirs) expandedDirs.value = new Set(state.expandedDirs as string[])
    } catch { /* ignore corrupted data */ }
  }

  /** Get persisted doc metadata as a Map for quick lookup */
  function getPersistedDocMetaMap(): Map<string, PersistedDocMeta> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return new Map()
      const state = JSON.parse(raw)
      const map = new Map<string, PersistedDocMeta>()
      for (const d of (state.docMeta ?? []) as PersistedDocMeta[]) {
        map.set(d.id, d)
      }
      return map
    } catch {
      return new Map()
    }
  }

  async function doScanDirectory(path: string) {
    // Skip if this folder is already loaded (check actual tree, not just rootPaths)
    if (docTree.value.some(d => d.id === path)) return

    isLoading.value = true
    try {
      const tree = await scanDirectory(path)
      // Merge persisted favorite/lastOpen/visitCount data into new tree
      const persisted = getPersistedDocMetaMap()
      mergePersistedIntoTree(tree, persisted)
      // Wrap in a root node so the selected folder appears as the tree root
      const rootName = path.replaceAll('\\', '/').split('/').pop() || path
      const rootNode: DocMeta = {
        id: path,
        name: rootName,
        path,
        type: 'text',
        size: 0,
        modified: 0,
        favorite: false,
        tags: [],
        lastOpen: null,
        visitCount: 0,
        children: tree,
      }
      docTree.value = [...docTree.value, rootNode]
      rootPaths.value = [...rootPaths.value, path]
      // Auto-expand the root folder
      expandedDirs.value.add(path)
      persistState()
      // Trigger full-text index build (fire-and-forget, don't await)
      const searchStore = useSearchStore()
      searchStore.doBuildIndex()
    } finally {
      isLoading.value = false
    }
  }

  function doRemoveRootFolder(id: string) {
    docTree.value = docTree.value.filter(d => d.id !== id)
    rootPaths.value = rootPaths.value.filter(p => p !== id)
    expandedDirs.value.delete(id)
    expandedDirs.value = new Set(expandedDirs.value)
    persistState()
    // Rebuild search index
    const searchStore = useSearchStore()
    searchStore.doBuildIndex()
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
      const content = await parseMarkdown(raw, meta)
      currentDoc.value = content
      persistState()
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
    persistState()
  }

  function doToggleExpanded(id: string) {
    if (expandedDirs.value.has(id)) {
      expandedDirs.value.delete(id)
    } else {
      expandedDirs.value.add(id)
    }
    expandedDirs.value = new Set(expandedDirs.value)
    persistState()
  }

  // Auto-persist on changes
  watch(docTree, () => persistState(), { deep: true })
  watch(expandedDirs, () => persistState(), { deep: true })

  // Load persisted state on creation
  loadPersistedState()

  // If rootPaths were persisted, auto-rescan to restore the docTree
  if (rootPaths.value.length > 0) {
    for (const p of rootPaths.value) {
      doScanDirectory(p)
    }
  }

  return {
    docTree, currentDoc, expandedDirs, rootPaths, isLoading,
    doScanDirectory, doLoadDocument, doToggleFavorite, doToggleExpanded,
    doRemoveRootFolder,
    loadPersistedState, persistState,
  }
})