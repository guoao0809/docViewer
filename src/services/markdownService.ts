import MarkdownIt from 'markdown-it'
import markdownItAnchor from 'markdown-it-anchor'
import DOMPurify from 'dompurify'
import { createHighlighter, type Highlighter } from 'shiki'
import type { DocContent, TocItem, DocMeta } from '@/types/document'

let highlighter: Highlighter | null = null

const SHIKI_LANGS = [
  'javascript', 'typescript', 'rust', 'python', 'go', 'html', 'css', 'json',
  'bash', 'markdown', 'yaml', 'toml', 'xml', 'sql', 'cpp', 'java', 'vue',
]

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['vitesse-dark', 'vitesse-light'],
      langs: SHIKI_LANGS,
    })
  }
  return highlighter
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

export async function parseMarkdown(raw: string, meta: DocMeta): Promise<DocContent> {
  const h = await getHighlighter()
  const loadedLangs = h.getLoadedLanguages()

  const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight(code: string, lang: string): string {
      const normalizedLang = lang || 'text'
      const effectiveLang = loadedLangs.includes(normalizedLang) ? normalizedLang : 'text'
      try {
        return h.codeToHtml(code, { lang: effectiveLang, theme: 'vitesse-dark' })
      } catch {
        return `<pre><code>${MarkdownIt().utils.escapeHtml(code)}</code></pre>`
      }
    },
  })

  md.use(markdownItAnchor, {
    permalink: true,
    permalinkBefore: true,
    permalinkSymbol: '#',
  })

  const rawHtml = md.render(raw)
  const html = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['span'],
    ADD_ATTR: ['style', 'class'],
  })
  const toc = extractToc(raw)

  return { meta, raw, html, toc }
}