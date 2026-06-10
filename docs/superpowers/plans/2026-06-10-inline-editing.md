# 应用内编辑功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 点击编辑按钮切换为 CodeMirror 6 编辑器，自动保存到文件，切回查看模式时重新渲染 Markdown。

**Architecture:** Rust 新增 `write_document` 命令（fs::write），前端 `tauriService` 封装调用，`ContentViewer` 通过 `viewMode` ref 切换渲染视图和 CodeMirror 编辑器，`EditorView.updateListener` 监听变更 + debounce 1.5s 自动保存。

**Tech Stack:** CodeMirror 6 (`codemirror`, `@codemirror/view`, `@codemirror/state`, `@codemirror/lang-markdown`, `@codemirror/lang-json`, `@codemirror/lang-yaml`, `@codemirror/language`, `@codemirror/commands`)

---

### Task 1: Rust 后端 — 新增 `write_document` 命令

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 在 lib.rs 中添加 `write_document` 函数**

在 `scan_dir_recursive` 函数之后、`run` 函数之前添加：

```rust
#[tauri::command]
fn write_document(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))
}
```

- [ ] **Step 2: 在 `invoke_handler` 中注册 `write_document`**

将现有的 `invoke_handler` 从：
```rust
.invoke_handler(tauri::generate_handler![
    scan_directory,
    read_document,
    get_file_metadata
])
```

改为：
```rust
.invoke_handler(tauri::generate_handler![
    scan_directory,
    read_document,
    get_file_metadata,
    write_document
])
```

- [ ] **Step 3: 构建 Rust 后端并提交**

```bash
cargo build --manifest-path src-tauri/Cargo.toml
git add src-tauri/src/lib.rs
git commit -m "feat: add write_document command"
```

---

### Task 2: 安装 CodeMirror 6 依赖

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: 安装 CodeMirror 包**

```bash
npm install codemirror @codemirror/lang-markdown @codemirror/view @codemirror/state @codemirror/language @codemirror/commands @codemirror/lang-json @codemirror/lang-yaml
```

- [ ] **Step 2: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: install CodeMirror 6 packages"
```

---

### Task 3: 前端服务 — 新增 `writeDocument`

**Files:**
- Modify: `src/services/tauriService.ts`

- [ ] **Step 1: 添加 `writeDocument` 函数**

在 `tauriService.ts` 中已有函数之后添加：

```typescript
/** Write content to a file via the Rust backend */
export async function writeDocument(path: string, content: string): Promise<void> {
  try {
    await invoke('write_document', { path, content })
  } catch (error) {
    console.error('Failed to write document:', error)
    throw error
  }
}
```

`invoke` 已从 `@tauri-apps/api/core` 导入，无需新增 import。

- [ ] **Step 2: 构建验证并提交**

```bash
npm run build
git add src/services/tauriService.ts
git commit -m "feat: add writeDocument service function"
```

---

### Task 4: ContentViewer — 编辑/查看模式切换 + CodeMirror 集成

**Files:**
- Modify: `src/components/viewer/ContentViewer.vue`

这是核心任务。需要添加：编辑/查看模式切换、CodeMirror 初始化、自动保存逻辑。

- [ ] **Step 1: 修改 `<script setup>` — 新增编辑器逻辑**

将整个 `<script setup>` 替换为：

```typescript
<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog, writeDocument } from '@/services/tauriService'
import { FileText, Edit3, Eye, Copy, MoreHorizontal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { json } from '@codemirror/lang-json'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

const viewMode = ref(true)
const editorContainer = ref<HTMLDivElement | null>(null)
const editorView = ref<EditorView | null>(null)
let saveTimer: ReturnType<typeof setTimeout> | null = null

/** 根据文件类型返回 CodeMirror 语言扩展 */
function getLanguageExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (ext === 'md' || ext === 'markdown') return markdown()
  if (ext === 'json') return json()
  // yaml/toml/xml/csv/txt — fallback to no language (plain text)
  return []
}

/** 切换到编辑模式 */
async function enterEditMode() {
  viewMode.value = false
  await nextTick()

  if (!editorContainer.value || !documentStore.currentDoc) return

  const langExt = getLanguageExtension(documentStore.currentDoc.meta.name)

  editorView.value = new EditorView({
    doc: documentStore.currentDoc.raw,
    extensions: [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      langExt,
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          if (saveTimer) clearTimeout(saveTimer)
          saveTimer = setTimeout(() => {
            const content = update.state.doc.toString()
            const path = documentStore.currentDoc!.meta.path
            writeDocument(path, content).catch(err => {
              console.error('Auto-save failed:', err)
            })
          }, 1500)
        }
      }),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { overflow: 'auto' },
        '.cm-editor': { height: '100%' },
      }),
    ],
    parent: editorContainer.value,
  })
}

/** 切换回查看模式 */
async function exitEditMode() {
  // 立即保存当前内容
  if (editorView.value) {
    const content = editorView.value.state.doc.toString()
    const path = documentStore.currentDoc!.meta.path
    try {
      await writeDocument(path, content)
    } catch (err) {
      console.error('Save before exit failed:', err)
    }
    editorView.value.destroy()
    editorView.value = null
  }
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  viewMode.value = true
  // 重新加载文档以刷新渲染
  documentStore.doLoadDocument(documentStore.currentDoc!.meta.id)
}

/** 编辑/查看切换 */
function toggleEditMode() {
  if (viewMode.value) {
    enterEditMode()
  } else {
    exitEditMode()
  }
}

// 切换文档时：如果在编辑模式，先保存再切回查看
watch(() => documentStore.currentDoc?.meta.id, () => {
  if (!viewMode.value && editorView.value) {
    // 静默保存
    const content = editorView.value.state.doc.toString()
    const path = documentStore.currentDoc!.meta.path
    writeDocument(path, content).catch(() => {})
    editorView.value.destroy()
    editorView.value = null
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  }
  viewMode.value = true
})

// 组件销毁时清理
onBeforeUnmount(() => {
  editorView.value?.destroy()
  if (saveTimer) clearTimeout(saveTimer)
})

// ---- 以下为已有的搜索高亮逻辑，保持不变 ----

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function highlightText(container: HTMLElement, matchText: string) {
  const terms = matchText.split(/\s+/).filter(t => t.length > 1).map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (terms.length === 0) return
  const regex = new RegExp(`(${terms.join('|')})`, 'gi')
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (parent.closest('pre, code, mark')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  for (const node of textNodes) {
    const text = node.textContent ?? ''
    if (!regex.test(text)) continue
    regex.lastIndex = 0
    const frag = document.createDocumentFragment()
    let lastIdx = 0; let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      const mark = document.createElement('mark')
      mark.style.cssText = 'background-color: #fde047; color: #000; border-radius: 2px; padding: 0 1px;'
      mark.textContent = match[0]
      frag.appendChild(mark)
      lastIdx = regex.lastIndex
    }
    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.slice(lastIdx)))
    node.parentNode?.replaceChild(frag, node)
  }
}

function clearHighlights(container: HTMLElement) {
  container.querySelectorAll('mark').forEach(mark => {
    mark.parentNode?.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
    mark.parentNode?.normalize()
  })
}

function scrollToFirstMatch() {
  const firstMark = document.querySelector('.markdown-content mark')
  if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(() => searchStore.highlightTarget, async (target) => {
  if (!target || target.docId !== documentStore.currentDoc?.meta.id) return
  await nextTick()
  const container = document.querySelector('.markdown-content') as HTMLElement | null
  if (!container) return
  clearHighlights(container)
  highlightText(container, target.matchText)
  scrollToFirstMatch()
})

function handleContentClick() {
  searchStore.doClearHighlight()
}
</script>
```

- [ ] **Step 2: 修改模板 — 编辑/查看模式切换**

将整个 `<template>` 替换为：

```html
<template>
  <!-- Empty state -->
  <div v-if="!documentStore.currentDoc" class="h-full flex flex-col items-center justify-center bg-bg">
    <FileText class="w-16 h-16 mb-4 text-text/15" />
    <p class="text-lg mb-2 text-title/50">打开一个文档</p>
    <p class="text-sm mb-5 text-text/30">从左侧文件夹或中间文档列表选择</p>
    <Button class="bg-primary text-white hover:bg-primary/90" @click="handleOpenFolder">
      选择文件夹
    </Button>
  </div>

  <!-- Content -->
  <div v-else class="h-full flex flex-col bg-bg">
    <!-- Title bar -->
    <div class="flex items-center gap-3 px-6 h-12 shrink-0 border-b border-border">
      <span class="text-lg font-semibold truncate flex-1 text-title">
        {{ documentStore.currentDoc.meta.name }}
      </span>
      <Button
        variant="ghost"
        size="icon"
        class="text-text/50 hover:bg-hover"
        :title="viewMode ? '编辑' : '查看'"
        @click="toggleEditMode"
      >
        <Edit3 v-if="viewMode" class="w-4 h-4" />
        <Eye v-else class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="复制">
        <Copy class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="更多">
        <MoreHorizontal class="w-4 h-4" />
      </Button>
    </div>

    <!-- View mode -->
    <div v-if="viewMode" class="flex-1 overflow-y-auto" @click="handleContentClick">
      <div class="markdown-content" v-html="documentStore.currentDoc.html" />
    </div>

    <!-- Edit mode -->
    <div v-else ref="editorContainer" class="flex-1 overflow-hidden bg-bg" />
  </div>
</template>
```

- [ ] **Step 3: 构建验证并提交**

```bash
npm run build
```

如果构建报错，检查：
- `Eye` 图标是否从 `lucide-vue-next` 正确导入
- CodeMirror 的 `json` 函数是否正确使用（需要 `@codemirror/lang-json` 已安装）
- 类型错误：`import type` vs `import` 的差异

```bash
git add src/components/viewer/ContentViewer.vue
git commit -m "feat: add inline editing with CodeMirror 6 and auto-save"
```

---

## 验证清单

- [ ] `npm run build` 构建通过
- [ ] `npm run tauri dev` 启动后：
  1. 打开一个 Markdown 文件 → 渲染正常
  2. 点击编辑按钮 → 切换到 CodeMirror 编辑器，显示原始源码
  3. 编辑内容 → 等待 1.5s → 文件自动保存
  4. 点击查看按钮 → 切回渲染视图，内容已更新
  5. 切换文档 → 自动保存当前编辑内容
  6. 编辑 JSON 文件 → 使用 json 语法高亮
