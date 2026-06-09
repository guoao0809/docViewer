import MiniSearch from 'minisearch'
import type { DocMeta } from '@/types/document'
import type { SearchResult } from '@/types/search'

interface IndexDoc {
  id: string
  name: string
  path: string
  content: string
}

const MAX_FILE_SIZE = 1_000_000 // 1MB: skip files larger than this

let miniSearch: MiniSearch<IndexDoc> | null = null
let indexedDocIds: Set<string> | null = null

function flattenDocs(docs: DocMeta[]): DocMeta[] {
  const result: DocMeta[] = []
  for (const doc of docs) {
    if (!doc.children) result.push(doc)
    if (doc.children) result.push(...flattenDocs(doc.children))
  }
  return result
}

export function getIndexedDocIds(): Set<string> | null {
  return indexedDocIds
}

export async function buildIndex(
  docs: DocMeta[],
  readDoc: (id: string) => Promise<string>,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const leaves = flattenDocs(docs)
  const total = leaves.length
  const indexDocs: IndexDoc[] = []

  for (let i = 0; i < leaves.length; i++) {
    const doc = leaves[i]
    onProgress?.(i + 1, total)
    try {
      const content = await readDoc(doc.id)
      if (content.length <= MAX_FILE_SIZE) {
        indexDocs.push({
          id: doc.id,
          name: doc.name,
          path: doc.path,
          content,
        })
      }
    } catch {
      // Skip unreadable files
    }
  }

  miniSearch = new MiniSearch<IndexDoc>({
    idField: 'id',
    fields: ['name', 'content', 'path'],
    storeFields: ['name', 'path', 'content'],
    searchOptions: {
      boost: { name: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  })

  miniSearch.addAll(indexDocs)
  indexedDocIds = new Set(indexDocs.map(d => d.id))
}

export function searchIndex(query: string): SearchResult[] {
  if (!miniSearch || !query.trim()) return []

  const raw = miniSearch.search(query.trim(), { prefix: true, fuzzy: 0.2 })

  return raw.slice(0, 20).map(r => {
    const stored = miniSearch!.getStoredFields(r.id)
    const content = (stored?.content as string) ?? ''
    const name = (stored?.name as string) ?? undefined
    const snippet = extractSnippet(content, query.trim())

    let line = 0
    if (content && r.terms && r.terms.length > 0) {
      const firstTerm = r.terms[0]
      const idx = content.toLowerCase().indexOf(firstTerm.toLowerCase())
      if (idx >= 0) {
        line = content.slice(0, idx).split('\n').length
      }
    }

    return {
      docId: r.id,
      fileName: name ?? r.id.split('/').pop() ?? r.id,
      snippet,
      score: r.score,
      line,
      matchText: r.terms ? r.terms.slice(0, 5).join(' ') : query.trim(),
      terms: r.terms ?? [query.trim()],
    }
  })
}

function extractSnippet(content: string, query: string, contextLen = 60): string {
  if (!content) return ''
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerContent.indexOf(lowerQuery)

  if (idx < 0) {
    // Try each query term
    for (const term of lowerQuery.split(/\s+/)) {
      const termIdx = lowerContent.indexOf(term)
      if (termIdx >= 0) {
        const start = Math.max(0, termIdx - contextLen)
        const end = Math.min(content.length, termIdx + term.length + contextLen)
        return (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '')
      }
    }
    return content.slice(0, contextLen * 2).replace(/\n/g, ' ') + '...'
  }

  const start = Math.max(0, idx - contextLen)
  const end = Math.min(content.length, idx + query.length + contextLen)
  return (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '')
}

export function isIndexReady(): boolean {
  return miniSearch !== null
}

export function resetIndex(): void {
  miniSearch = null
  indexedDocIds = null
}
