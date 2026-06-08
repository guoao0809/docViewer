import MarkdownIt from 'markdown-it'
import markdownItAnchor from 'markdown-it-anchor'
import DOMPurify from 'dompurify'
import type { DocContent, TocItem, DocMeta } from '@/types/document'

let md: MarkdownIt | null = null

function getMarkdownIt(): MarkdownIt {
  if (!md) {
    md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true,
    })

    md.use(markdownItAnchor, {
      permalink: true,
      permalinkBefore: true,
      permalinkSymbol: '#',
    })
  }
  return md
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extractToc(raw: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: TocItem[] = []
  const stack: TocItem[] = []

  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(raw)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = slugify(text)

    const item: TocItem = { id, text, level }

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    if (stack.length === 0) {
      headings.push(item)
    } else {
      const parent = stack[stack.length - 1]
      if (!parent.children) parent.children = []
      parent.children.push(item)
    }

    stack.push(item)
  }

  return headings
}

export function parseMarkdown(raw: string, meta: DocMeta): DocContent {
  const md = getMarkdownIt()
  const rawHtml = md.render(raw)
  const html = DOMPurify.sanitize(rawHtml)
  const toc = extractToc(raw)

  return { meta, raw, html, toc }
}
