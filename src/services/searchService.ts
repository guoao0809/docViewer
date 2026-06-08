import Fuse from 'fuse.js'
import type { DocMeta } from '@/types/document'
import type { SearchResult } from '@/types/search'

let fuse: Fuse<DocMeta> | null = null

function getFuseInstance(docs: DocMeta[]): Fuse<DocMeta> {
  if (!fuse) {
    fuse = new Fuse(docs, {
      keys: [
        { name: 'name', weight: 0.6 },
        { name: 'path', weight: 0.4 },
      ],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 1,
    })
  }
  return fuse
}

export function resetSearchIndex(): void {
  fuse = null
}

export function searchDocuments(query: string, docs: DocMeta[]): SearchResult[] {
  if (!query.trim()) return []

  const fuseInstance = getFuseInstance(docs)
  fuseInstance.setCollection(docs)

  const results = fuseInstance.search(query.trim())

  return results.slice(0, 20).map((result, index) => ({
    docId: result.item.id,
    fileName: result.item.name,
    snippet: result.item.path,
    score: result.score ?? 0,
    line: index,
  }))
}

export function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem('docviewer-search-history')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function addSearchHistory(query: string): void {
  if (!query.trim()) return
  const history = getSearchHistory()
  const filtered = history.filter(h => h !== query)
  filtered.unshift(query)
  const trimmed = filtered.slice(0, 20)
  localStorage.setItem('docviewer-search-history', JSON.stringify(trimmed))
}
