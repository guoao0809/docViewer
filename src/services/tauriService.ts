import { invoke } from '@tauri-apps/api/core'
import { readTextFile, readDir, exists } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import type { DocMeta, FileMeta } from '@/types/document'

const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.xml', '.csv']

export function getFileType(name: string): 'markdown' | 'text' | 'code' {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext && ['json', 'yaml', 'yml', 'toml', 'xml', 'csv'].includes(ext)) return 'code'
  return 'text'
}

function isSupportedFile(name: string): boolean {
  const lower = name.toLowerCase()
  return SUPPORTED_EXTENSIONS.some(ext => lower.endsWith(ext))
}

export async function scanDirectory(path: string): Promise<DocMeta[]> {
  try {
    const entries = await readDir(path)
    const result: DocMeta[] = []

    for (const entry of entries) {
      const entryPath = `${path}/${entry.name}`.replace(/\\/g, '/')

      if (entry.isDirectory) {
        const children = await scanDirectory(entryPath)
        result.push({
          id: entryPath,
          name: entry.name,
          path: entryPath,
          type: 'text',
          size: 0,
          modified: 0,
          favorite: false,
          tags: [],
          lastOpen: null,
          visitCount: 0,
          children,
        })
      } else if (entry.isFile && isSupportedFile(entry.name)) {
        try {
          const meta = await invoke<FileMeta>('get_file_metadata', { path: entryPath })
          result.push({
            id: entryPath,
            name: entry.name,
            path: entryPath,
            type: getFileType(entry.name),
            size: meta.size,
            modified: meta.modified,
            favorite: false,
            tags: [],
            lastOpen: null,
            visitCount: 0,
          })
        } catch {
          result.push({
            id: entryPath,
            name: entry.name,
            path: entryPath,
            type: getFileType(entry.name),
            size: 0,
            modified: 0,
            favorite: false,
            tags: [],
            lastOpen: null,
            visitCount: 0,
          })
        }
      }
    }

    return result.sort((a, b) => {
      if (a.children && !b.children) return -1
      if (!a.children && b.children) return 1
      return a.name.localeCompare(b.name)
    })
  } catch (error) {
    console.error('Failed to scan directory:', error)
    return []
  }
}

export async function readDocument(path: string): Promise<string> {
  const content = await readTextFile(path)
  return content
}

export async function openFileDialog(): Promise<string | null> {
  try {
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择包含 Markdown 文档的文件夹',
    })
    return selected as string | null
  } catch (error) {
    console.error('Failed to open file dialog:', error)
    return null
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    return await exists(path)
  } catch {
    return false
  }
}

export async function getFileMetadata(path: string): Promise<FileMeta> {
  try {
    return await invoke<FileMeta>('get_file_metadata', { path })
  } catch {
    return { size: 0, modified: 0, type: 'text' }
  }
}
