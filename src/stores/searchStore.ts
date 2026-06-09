import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchResult } from '@/types/search'
import { searchIndex, buildIndex, isIndexReady } from '@/services/searchService'
import { readDocument } from '@/services/tauriService'
import { useDocumentStore } from './documentStore'
import type { DocMeta } from '@/types/document'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const searchHistory = ref<string[]>(getSearchHistory())
  const isOpen = ref(false)
  const isIndexing = ref(false)
  const indexProgress = ref({ current: 0, total: 0 })
  const highlightTarget = ref<{ docId: string; matchText: string } | null>(null)
  const showHistory = ref(false)

  function flattenDocs(docs: DocMeta[]): DocMeta[] {
    const result: DocMeta[] = []
    for (const doc of docs) {
      if (!doc.children) result.push(doc)
      if (doc.children) result.push(...flattenDocs(doc.children))
    }
    return result
  }

  async function doBuildIndex() {
    const docStore = useDocumentStore()
    const leaves = flattenDocs(docStore.docTree)
    if (leaves.length === 0) return

    isIndexing.value = true
    indexProgress.value = { current: 0, total: leaves.length }

    try {
      await buildIndex(docStore.docTree, readDocument, (current, total) => {
        indexProgress.value = { current, total }
      })
    } finally {
      isIndexing.value = false
    }
  }

  function doSearch(q: string) {
    query.value = q
    if (!q.trim()) { results.value = []; isSearching.value = false; return }

    if (!isIndexReady()) {
      results.value = []
      return
    }

    isSearching.value = true
    results.value = searchIndex(q)
    isSearching.value = false
  }

  function doAddToHistory(q: string) {
    addSearchHistory(q)
    searchHistory.value = getSearchHistory()
  }

  function doOpenSearch() { isOpen.value = true; showHistory.value = false; query.value = ''; results.value = [] }
  function doOpenSearchWithHistory() { isOpen.value = true; showHistory.value = true; query.value = ''; results.value = [] }
  function doCloseSearch() { isOpen.value = false; showHistory.value = false; query.value = ''; results.value = [] }
  function doClearHighlight() { highlightTarget.value = null }

  function doRemoveFromHistory(q: string) {
    const history = getSearchHistory().filter(h => h !== q)
    localStorage.setItem('docviewer-search-history', JSON.stringify(history))
    searchHistory.value = history
  }

  function doClearHistory() {
    localStorage.removeItem('docviewer-search-history')
    searchHistory.value = []
  }

  return {
    query, results, isSearching, searchHistory, isOpen, showHistory,
    isIndexing, indexProgress, highlightTarget,
    doSearch, doAddToHistory, doOpenSearch, doOpenSearchWithHistory, doCloseSearch,
    doBuildIndex, doClearHighlight, doRemoveFromHistory, doClearHistory,
  }
})

function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem('docviewer-search-history')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addSearchHistory(q: string): void {
  if (!q.trim()) return
  const history = getSearchHistory()
  const filtered = history.filter(h => h !== q)
  filtered.unshift(q)
  const trimmed = filtered.slice(0, 20)
  localStorage.setItem('docviewer-search-history', JSON.stringify(trimmed))
}
