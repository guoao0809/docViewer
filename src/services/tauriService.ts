import { invoke } from '@tauri-apps/api/core'
import { readTextFile, exists } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import type { DocMeta, FileMeta } from '@/types/document'

/** Scan directory recursively via the Rust backend command, which is not subject to plugin scope restrictions. */
export async function scanDirectory(path: string): Promise<DocMeta[]> {
  try {
    return await invoke<DocMeta[]>('scan_directory', { path })
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
