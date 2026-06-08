import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchResult } from '@/types/search'
import { searchDocuments, getSearchHistory, addSearchHistory } from '@/services/searchService'
import { useDocumentStore } from './documentStore'
import type { DocMeta } from '@/types/document'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const searchHistory = ref<string[]>(getSearchHistory())
  const isOpen = ref(false)

  function flattenDocs(docs: DocMeta[]): DocMeta[] {
    const result: DocMeta[] = []
    for (const doc of docs) {
      if (!doc.children) result.push(doc)
      if (doc.children) result.push(...flattenDocs(doc.children))
    }
    return result
  }

  function doSearch(q: string) {
    query.value = q
    if (!q.trim()) { results.value = []; isSearching.value = false; return }
    isSearching.value = true
    const docStore = useDocumentStore()
    const allDocs = flattenDocs(docStore.docTree)
    results.value = searchDocuments(q, allDocs)
    isSearching.value = false
  }

  function doAddToHistory(q: string) {
    addSearchHistory(q)
    searchHistory.value = getSearchHistory()
  }

  function doOpenSearch() { isOpen.value = true; query.value = ''; results.value = [] }
  function doCloseSearch() { isOpen.value = false; query.value = ''; results.value = [] }

  return { query, results, isSearching, searchHistory, isOpen, doSearch, doAddToHistory, doOpenSearch, doCloseSearch }
})
