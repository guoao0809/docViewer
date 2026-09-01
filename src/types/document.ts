export interface DocMeta {
  id: string
  name: string
  path: string
  type: 'markdown' | 'text' | 'code' | 'image'
  size: number
  modified: number
  tags: string[]
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
