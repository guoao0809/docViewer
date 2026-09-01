import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { DocMeta, DocContent } from '@/types/document'
import { scanDirectory, readDocument, getFileMetadata, readImageBase64 } from '@/services/tauriService'
import { parseMarkdown } from '@/services/markdownService'
import { useSearchStore } from './searchStore'

const STORAGE_KEY = 'docviewer-state'

interface PersistedDocMeta {
  id: string
}

function serializeDocTree(docs: DocMeta[]): PersistedDocMeta[] {
  const result: PersistedDocMeta[] = []
  for (const doc of docs) {
    result.push({ id: doc.id })
    if (doc.children) result.push(...serializeDocTree(doc.children))
  }
  return result
}

function mergePersistedIntoTree(docs: DocMeta[], persisted: Map<string, PersistedDocMeta>): void {
  for (const doc of docs) {
    const p = persisted.get(doc.id)
    if (p) {
      // Persisted doc metadata is currently identity-only; nothing to merge yet.
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
  const openedDocs = ref<DocMeta[]>([])
  const activeDocId = ref<string | null>(null)
  const selectedNodeId = ref<string | null>(null)
  const pendingRemoveId = ref<string | null>(null)
  const pendingRemoveName = ref('')

  function doRequestRemove(id: string, name: string) {
    if (localStorage.getItem('docviewer-skip-remove-confirm') === 'true') {
      doRemoveRootFolder(id)
      return
    }
    pendingRemoveId.value = id
    pendingRemoveName.value = name
  }

  function doConfirmRemove() {
    if (pendingRemoveId.value) {
      doRemoveRootFolder(pendingRemoveId.value)
      pendingRemoveId.value = null
      pendingRemoveName.value = ''
    }
  }

  function doCancelRemove() {
    pendingRemoveId.value = null
    pendingRemoveName.value = ''
  }

  function persistState() {
    const state = {
      rootPaths: rootPaths.value,
      expandedDirs: Array.from(expandedDirs.value),
      docMeta: serializeDocTree(docTree.value),
      openedDocs: openedDocs.value.map(d => d.id),
      activeDocId: activeDocId.value,
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
      if (state.openedDocs && state.activeDocId !== undefined) {
        activeDocId.value = state.activeDocId as string | null
      }
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
    // Skip if this folder is already in the tree (but NOT if rootPaths has it from persistence)
    if (docTree.value.some(d => d.id === path)) return

    isLoading.value = true
    try {
      const tree = await scanDirectory(path)
      const persisted = getPersistedDocMetaMap()
      mergePersistedIntoTree(tree, persisted)
      const rootName = path.replaceAll('\\', '/').split('/').pop() || path
      const rootNode: DocMeta = {
        id: path,
        name: rootName,
        path,
        type: 'text',
        size: 0,
        modified: 0,
        tags: [],
        children: tree,
      }
      docTree.value = [...docTree.value, rootNode]
      if (!rootPaths.value.includes(path)) {
        rootPaths.value = [...rootPaths.value, path]
      }
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
    if (selectedNodeId.value && (selectedNodeId.value === id || selectedNodeId.value.startsWith(id))) {
      selectedNodeId.value = null
    }
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
      try {
        const fileMeta = await getFileMetadata(id)
        meta.size = fileMeta.size
        meta.modified = fileMeta.modified
      } catch { /* ignore */ }

      // 图片文件：读取 base64 用于显示
      if (meta.type === 'image') {
        const ext = meta.name.split('.').pop()?.toLowerCase() || 'png'
        const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp', svg: 'svg+xml', bmp: 'bmp', ico: 'x-icon' }
        const mime = mimeMap[ext] || 'png'
        const base64 = await readImageBase64(id)
        currentDoc.value = { meta, raw: `data:image/${mime};base64,${base64}`, html: '', toc: [] }
        persistState()
        return
      }

      const raw = await readDocument(id)
      const content = await parseMarkdown(raw, meta)
      currentDoc.value = content
      persistState()
    } finally {
      isLoading.value = false
    }
  }

  function doOpenDoc(doc: DocMeta) {
    // Add to openedDocs if not already there (put most recent first)
    if (!openedDocs.value.find(d => d.id === doc.id)) {
      openedDocs.value = [doc, ...openedDocs.value]
    }
    activeDocId.value = doc.id
    doLoadDocument(doc.id)
  }

  function doRemoveOpenedDoc(docId: string) {
    openedDocs.value = openedDocs.value.filter(d => d.id !== docId)
    if (activeDocId.value === docId) {
      const next = openedDocs.value[0]
      if (next) {
        activeDocId.value = next.id
        doLoadDocument(next.id)
      } else {
        activeDocId.value = null
        currentDoc.value = null
      }
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

  function doToggleExpanded(id: string) {
    if (expandedDirs.value.has(id)) {
      expandedDirs.value.delete(id)
    } else {
      expandedDirs.value.add(id)
    }
    expandedDirs.value = new Set(expandedDirs.value)
    persistState()
  }

  function doSelectNode(id: string) { selectedNodeId.value = id }

  function doCollapseAll() {
    expandedDirs.value = new Set()
    persistState()
  }

  /** Get the parent path for creating items under a selected node */
  function getParentPath(id: string): string {
    const doc = findDocById(id, docTree.value)
    if (!doc) return ''
    if (doc.children) return doc.path
    const p = doc.path.replaceAll('\\', '/')
    const lastSep = p.lastIndexOf('/')
    return lastSep > 0 ? p.substring(0, lastSep) : p
  }

  /** Re-scan parent directory to refresh children after create/delete */
  async function doRefreshChildren(parentId: string) {
    const parent = findDocById(parentId, docTree.value)
    if (!parent || !parent.children) {
      // If parent not found or has no children, maybe it's a file — refresh its parent folder
      const parentPath = getParentPath(parentId)
      const dirNode = findDocById(parentPath, docTree.value)
      if (!dirNode || !dirNode.children) return
      try {
        const fresh = await scanDirectory(dirNode.path)
        const persisted = getPersistedDocMetaMap()
        mergePersistedIntoTree(fresh, persisted)
        dirNode.children = fresh
      } catch { /* ignore */ }
    } else {
      try {
        const fresh = await scanDirectory(parent.path)
        const persisted = getPersistedDocMetaMap()
        mergePersistedIntoTree(fresh, persisted)
        parent.children = fresh
      } catch { /* ignore */ }
    }
    docTree.value = [...docTree.value]
    persistState()
    const searchStore = useSearchStore()
    searchStore.doBuildIndex()
  }

  async function doCreateFile(parentPath: string, name: string): Promise<string> {
    const { createFile } = await import('@/services/tauriService')
    return await createFile(parentPath, name)
  }

  async function doCreateFolder(parentPath: string, name: string): Promise<string> {
    const { createFolder } = await import('@/services/tauriService')
    return await createFolder(parentPath, name)
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
    openedDocs, activeDocId, selectedNodeId,
    pendingRemoveId, pendingRemoveName,
    doRequestRemove, doConfirmRemove, doCancelRemove,
    doScanDirectory, doLoadDocument, doToggleExpanded,
    doRemoveRootFolder, doOpenDoc, doRemoveOpenedDoc,
    doSelectNode, doCollapseAll, getParentPath, doRefreshChildren,
    doCreateFile, doCreateFolder,
    loadPersistedState, persistState,
  }
})