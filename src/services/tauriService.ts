import { invoke } from '@tauri-apps/api/core'
import { exists } from '@tauri-apps/plugin-fs'
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

/** Read document content via the Rust backend command (BOM-aware), not subject to plugin scope restrictions. */
export async function readDocument(path: string): Promise<string> {
  try {
    return await invoke<string>('read_document', { path })
  } catch (error) {
    console.error('Failed to read document:', error)
    throw error
  }
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

/** Read an image file as base64 string */
export async function readImageBase64(path: string): Promise<string> {
  try {
    return await invoke<string>('read_image_base64', { path })
  } catch (error) {
    console.error('Failed to read image:', error)
    throw error
  }
}

/** Write content to a file via the Rust backend command */
export async function writeDocument(path: string, content: string): Promise<void> {
  try {
    await invoke('write_document', { path, content })
  } catch (error) {
    console.error('Failed to write document:', error)
    throw error
  }
}

/** Create an empty file at path/name, returns full path */
export async function createFile(path: string, name: string): Promise<string> {
  try {
    return await invoke<string>('create_file', { path, name })
  } catch (error) {
    console.error('Failed to create file:', error)
    throw error
  }
}

/** Create a folder at path/name, returns full path */
export async function createFolder(path: string, name: string): Promise<string> {
  try {
    return await invoke<string>('create_folder', { path, name })
  } catch (error) {
    console.error('Failed to create folder:', error)
    throw error
  }
}
