import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchResult } from '@/types/search'
import { searchIndex } from '@/services/searchService'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const isSearching = ref(false)
  const searchHistory = ref<string[]>(getSearchHistory())
  const isOpen = ref(false)

  function doSearch(q: string) {
    query.value = q
    if (!q.trim()) { results.value = []; isSearching.value = false; return }
    isSearching.value = true
    results.value = searchIndex(q)
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
