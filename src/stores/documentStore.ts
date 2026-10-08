import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { DocMeta, DocContent } from '@/types/document'
import { scanDirectory, readDocument, getFileMetadata, readFileBytes, renamePath, trashPath } from '@/services/tauriService'
import { parseMarkdown } from '@/services/markdownService'
import { useSearchStore } from './searchStore'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { revealItemInDir } from '@tauri-apps/plugin-opener'

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

  // 右键菜单状态
  const contextMenu = ref<{ visible: boolean; x: number; y: number; nodeId: string | null }>({
    visible: false, x: 0, y: 0, nodeId: null,
  })
  const renamingNodeId = ref<string | null>(null)
  const pendingTrashId = ref<string | null>(null)
  const pendingTrashName = ref('')

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

      // 图片/PDF 文件：读取原始字节，交给 OpenFileViewer 预览
      if (meta.type === 'image' || meta.type === 'pdf') {
        const bytes = await readFileBytes(id)
        currentDoc.value = { meta, raw: '', html: '', toc: [], bytes }
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

  function doOpenContextMenu(x: number, y: number, nodeId: string) {
    contextMenu.value = { visible: true, x, y, nodeId }
  }

  function doCloseContextMenu() {
    contextMenu.value = { visible: false, x: 0, y: 0, nodeId: null }
  }

  function doStartRename(id: string) { renamingNodeId.value = id }
  function doCancelRename() { renamingNodeId.value = null }

  /** 复制节点完整路径到系统剪贴板 */
  async function doCopyPath(id: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    try {
      await writeText(node.path)
    } catch (e) {
      console.error('Failed to copy path:', e)
    }
  }

  /** 在系统文件管理器中定位该节点 */
  async function doRevealInExplorer(id: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    try {
      await revealItemInDir(node.path)
    } catch (e) {
      console.error('Failed to reveal in explorer:', e)
    }
  }

  /** 重命名：改名并同步更新子树 id/path、根路径与当前激活项 */
  async function doRenameNode(id: string, newName: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    const trimmed = newName.trim()
    if (!trimmed || trimmed === node.name) { renamingNodeId.value = null; return }

    let newPath: string
    try {
      newPath = await renamePath(id, trimmed)
    } catch (e) {
      console.error('Rename failed:', e)
      renamingNodeId.value = null
      return
    }

    const oldPath = node.path
    const remap = (n: DocMeta) => {
      n.id = newPath + n.id.slice(oldPath.length)
      n.path = n.id
      n.children?.forEach(remap)
    }
    remap(node)
    node.name = trimmed

    const withinOld = (p: string) =>
      p === oldPath || p.startsWith(oldPath + '/') || p.startsWith(oldPath + '\\')

    const idx = rootPaths.value.indexOf(oldPath)
    if (idx >= 0) rootPaths.value[idx] = newPath
    if (activeDocId.value && withinOld(activeDocId.value)) {
      activeDocId.value = newPath + activeDocId.value.slice(oldPath.length)
    }
    if (selectedNodeId.value && withinOld(selectedNodeId.value)) {
      selectedNodeId.value = newPath + selectedNodeId.value.slice(oldPath.length)
    }
    // 展开态以路径作键，重映射后重命名文件夹不会意外折叠
    const nextExpanded = new Set<string>()
    for (const k of expandedDirs.value) {
      nextExpanded.add(withinOld(k) ? newPath + k.slice(oldPath.length) : k)
    }
    expandedDirs.value = nextExpanded

    renamingNodeId.value = null
    docTree.value = [...docTree.value]
    persistState()
    useSearchStore().doBuildIndex()
  }

  /** 删除：先弹确认 */
  function doRequestTrash(id: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    pendingTrashId.value = id
    pendingTrashName.value = node.name
  }

  function doCancelTrash() {
    pendingTrashId.value = null
    pendingTrashName.value = ''
  }

  /** 确认删除：移入回收站并从树中移除 */
  async function doConfirmTrash() {
    const id = pendingTrashId.value
    pendingTrashId.value = null
    pendingTrashName.value = ''
    if (!id) return

    try {
      await trashPath(id)
    } catch (e) {
      console.error('Trash failed:', e)
      return
    }

    const within = (p: string | null | undefined) =>
      !!p && (p === id || p.startsWith(id + '/') || p.startsWith(id + '\\'))

    // 清理已打开标签 / 当前文档 / 选中态
    openedDocs.value = openedDocs.value.filter(d => !within(d.id))
    if (within(currentDoc.value?.meta.id)) currentDoc.value = null
    if (within(selectedNodeId.value)) selectedNodeId.value = null
    if (within(activeDocId.value)) {
      const nextTab = openedDocs.value[0]
      activeDocId.value = nextTab ? nextTab.id : null
      if (nextTab) doLoadDocument(nextTab.id)
    }

    if (rootPaths.value.includes(id)) {
      rootPaths.value = rootPaths.value.filter(p => p !== id)
      const nextExpanded = new Set<string>()
      for (const k of expandedDirs.value) if (!within(k)) nextExpanded.add(k)
      expandedDirs.value = nextExpanded
      docTree.value = docTree.value.filter(d => d.id !== id)
      persistState()
      useSearchStore().doBuildIndex()
    } else {
      // 刷新包含该节点的父目录。必须按节点 id 定位，不能用 getParentPath
      //（它为「在其下创建」服务，会返回规范化后的正斜杠路径，与节点 id 不匹配）
      const parentDirId = getContainingDirId(id)
      if (parentDirId) await doRefreshChildren(parentDirId)
    }
  }

  /** 查找包含指定节点的父目录节点 id（用于删除后刷新）；找不到返回空串 */
  function getContainingDirId(id: string): string {
    const search = (docs: DocMeta[]): string | null => {
      for (const d of docs) {
        if (!d.children) continue
        if (d.children.some(c => c.id === id)) return d.id
        const found = search(d.children)
        if (found) return found
      }
      return null
    }
    return search(docTree.value) ?? ''
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
    contextMenu, doOpenContextMenu, doCloseContextMenu,
    renamingNodeId, doStartRename, doCancelRename,
    pendingTrashId, pendingTrashName, doRequestTrash, doConfirmTrash, doCancelTrash,
    doCopyPath, doRevealInExplorer, doRenameNode,
    doScanDirectory, doLoadDocument, doToggleExpanded,
    doRemoveRootFolder, doOpenDoc, doRemoveOpenedDoc,
    doSelectNode, doCollapseAll, getParentPath, doRefreshChildren,
    doCreateFile, doCreateFolder,
    loadPersistedState, persistState,
  }
})