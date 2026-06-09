# DocViewer 应用内编辑功能设计文档

> 点击编辑按钮切换为 CodeMirror 6 编辑器，自动保存到文件。

## 概述

**目标**：点击 ContentViewer 标题栏的「编辑」按钮后，将 Markdown 渲染视图切换为 CodeMirror 6 代码编辑器，支持语法高亮和行号。编辑内容自动保存（debounce 1.5s）到原文件，点击「查看」按钮切回渲染视图时自动重新解析 Markdown。

**编辑器**：CodeMirror 6（`codemirror` + `@codemirror/lang-markdown`）

**保存方式**：自动保存（停止输入 1.5 秒后触发）

## 架构设计

### 数据流

```
用户输入 → CodeMirror onChange → debounce 1.5s
  → writeDocument(path, content) → Rust invoke → fs::write
  → 写入完成（静默，不刷新视图以保留光标位置）

用户切回查看模式 → parseMarkdown(raw) → 重新渲染 HTML
```

### 视图切换

```
┌─ 查看模式 (viewMode = true) ─────────┐
│  标题栏 [✏️ 编辑] [📋 复制] [⋯]       │
│  ┌──────────────────────────────────┐ │
│  │  渲染的 HTML (markdown-content)  │ │
│  └──────────────────────────────────┘ │
└──────────────────────────────────────┘
              ↓ 点击编辑按钮
┌─ 编辑模式 (viewMode = false) ────────┐
│  标题栏 [👁️ 查看] [📋 复制] [⋯]       │
│  ┌──────────────────────────────────┐ │
│  │  CodeMirror 6 编辑器             │ │
│  │  - 语法高亮 (markdown)           │ │
│  │  - 行号                          │ │
│  │  - 自动保存 (1.5s debounce)      │ │
│  └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

## 技术实现

### 依赖安装

```bash
npm install codemirror @codemirror/lang-markdown @codemirror/view @codemirror/state @codemirror/language @codemirror/commands @codemirror/lang-json @codemirror/lang-yaml
```

| 包 | 用途 |
|---|---|
| `codemirror` | 核心包（re-export） |
| `@codemirror/state` | EditorState |
| `@codemirror/view` | EditorView |
| `@codemirror/lang-markdown` | Markdown 语法高亮 |
| `@codemirror/lang-json` | JSON 语法高亮 |
| `@codemirror/lang-yaml` | YAML 语法高亮 |
| `@codemirror/language` | 语言支持 |
| `@codemirror/commands` | 基础编辑命令 |

### Rust 后端：`write_document` 命令

```rust
#[tauri::command]
fn write_document(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content.as_bytes())
        .map_err(|e| format!("Failed to write file: {}", e))
}
```

注册到 `invoke_handler`。

### 前端服务：`writeDocument`

```typescript
// src/services/tauriService.ts 新增
export async function writeDocument(path: string, content: string): Promise<void> {
  await invoke('write_document', { path, content })
}
```

### ContentViewer 改动

| 状态 | 条件 | 渲染 |
|---|---|---|
| `viewMode = true` | 默认 / 点击「查看」 | 渲染 HTML（原有 `v-html`） |
| `viewMode = false` | 点击「编辑」 | CodeMirror 编辑器，显示 `currentDoc.raw` |

关键逻辑：

```typescript
const viewMode = ref(true) // true = 查看, false = 编辑
const editorView = ref<EditorView | null>(null)

// 切换到编辑模式
function enterEditMode() {
  viewMode.value = false
  await nextTick()
  // 初始化 CodeMirror
  editorView.value = new EditorView({
    doc: documentStore.currentDoc!.raw,
    extensions: [/* markdown(), lineNumbers(), updateListener */],
    parent: editorContainer.value!,
  })
}

// 自动保存
const autoSave = EditorView.updateListener.of(update => {
  if (update.docChanged) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      const content = update.state.doc.toString()
      await writeDocument(currentPath, content)
    }, 1500)
  }
})

// 切换回查看模式
function exitEditMode() {
  viewMode.value = true
  editorView.value?.destroy()
  editorView.value = null
  // 重新加载并渲染文档
  documentStore.doLoadDocument(documentStore.currentDoc!.meta.id)
}
```

## 边界情况

| 场景 | 处理 |
|---|---|
| 切换文档时在编辑模式 | 自动保存 → 销毁编辑器 → 加载新文档（查看模式） |
| 保存失败 | `console.error` + 保留编辑器内容不变 |
| 编辑非 md 文件（json/yaml/txt） | 用对应 `@codemirror/lang-json` / `@codemirror/lang-yaml` 或纯文本 |
| 空文件 | 空编辑器正常显示 |
| 窗口关闭时在编辑模式 | 无影响（已自动保存） |

## 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `src-tauri/src/lib.rs` | 新增 `write_document` 命令 |
| 修改 | `src/services/tauriService.ts` | 新增 `writeDocument` 函数 |
| 修改 | `src/components/viewer/ContentViewer.vue` | 编辑/查看模式切换 + CodeMirror 集成 |
