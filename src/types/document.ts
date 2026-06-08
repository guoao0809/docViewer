export interface DocMeta {
  id: string
  name: string
  path: string
  type: 'markdown' | 'text' | 'code'
  size: number
  modified: number
  favorite: boolean
  tags: string[]
  lastOpen: number | null
  visitCount: number
  children?: DocMeta[]
}

export interface DocContent {
  meta: DocMeta
  raw: string
  html: string
  toc: TocItem[]
}

export interface TocItem {
  id: string
  text: string
  level: number
  children?: TocItem[]
}

export interface FileMeta {
  size: number
  modified: number
  type: string
}
