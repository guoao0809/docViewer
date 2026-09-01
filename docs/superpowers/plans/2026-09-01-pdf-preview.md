# PDF 预览功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 DocViewer 增量接入 PDF 预览，保留现有 Markdown/代码/图片渲染逻辑不变。

**Architecture:** Rust 端新增 `read_file_bytes` command 返回 `Vec<u8>`，前端经 Tauri invoke 得到 `number[]` 转成 `ArrayBuffer`，存进 `currentDoc.bytes`；`ContentViewer.vue` 检测到 `meta.type === 'pdf'` 时用 `@open-file-viewer/vue` 的 `OpenFileViewer` 组件 + `pdfPlugin({ workerSrc })` 渲染，源数据用 `new Blob([bytes])` 构造。

**Tech Stack:** Tauri v2、Vue 3 + TypeScript、`@open-file-viewer/core` 0.1.44、`@open-file-viewer/vue` 0.1.44、`pdfjs-dist` 6.3.289、Vite 8。

## Global Constraints

- 依赖已通过 `pnpm add @open-file-viewer/core @open-file-viewer/vue pdfjs-dist` 安装，勿重复添加。
- 版本：`@open-file-viewer/core@0.1.44`、`@open-file-viewer/vue@0.1.44`、`pdfjs-dist@6.3.289`。
- 所有 `MetaJob`/`DocMeta.type` 联合类型判断处，pdf 分支单独处理，禁止影响现有 `image`/`markdown` 分支。
- `DocContent` 新增可选字段 `bytes?: ArrayBuffer`——仅 pdf 分支填充，其他分支保持 `undefined`。
- Rust command 命名沿用现有 snake_case 风格：`read_file_bytes`。
- Windows 路径/创建命令通过 `pnpm`（packageManager `pnpm@11.24.0`）。路径用正斜杠相对路径。
- 类型检查命令：`npx vue-tsc --noEmit`；Rust 检查：`cargo check`（在 `src-tauri` 下）。

---

### Task 1: Rust 后端支持 `pdf` 类型与字节读取

**Files:**
- Modify: `src-tauri/src/lib.rs:44-49` (`is_supported_file` 扩展名表)
- Modify: `src-tauri/src/lib.rs:17-42` (`detect_file_type` 加 pdf 分支)
- Modify: `src-tauri/src/lib.rs:180-184` (在 `read_image_base64` 后新增 `read_file_bytes`)
- Modify: `src-tauri/src/lib.rs:280-288` (invoke_handler 注册)

**Interfaces:**
- Consumes: 无（首个任务）
- Produces:
  - `is_supported_file` 对 `.pdf` 返回 true（否则扫描时被过滤，根本不会出现在树里）
  - `detect_file_type(name)` 对 `.pdf` 返回 `"pdf"`
  - command `read_file_bytes(path: String) -> Result<Vec<u8>, String>`——前端 invoke 后得到 `number[]`

- [ ] **Step 1: `is_supported_file` 扩展名表加 `pdf`**

在 `src-tauri/src/lib.rs` 的 `is_supported_file`，把 `exts` 数组改为：

```rust
let exts = ["md", "markdown", "txt", "json", "yaml", "yml", "toml", "xml", "csv",
            "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "pdf"];
```

- [ ] **Step 2: `detect_file_type` 加 pdf 分支**

在 `read_image_base64` 的图片分支前后（else if 链中，加在 image 分支之后、`else` 之前）加入：

```rust
    } else if lower.ends_with(".pdf") {
        "pdf".to_string()
    } else {
```

最终链应为：
```rust
fn detect_file_type(name: &str) -> String {
    let lower = name.to_lowercase();
    if lower.ends_with(".md") || lower.ends_with(".markdown") {
        "markdown".to_string()
    } else if lower.ends_with(".json")
        || lower.ends_with(".yaml")
        || lower.ends_with(".yml")
        || lower.ends_with(".toml")
        || lower.ends_with(".xml")
        || lower.ends_with(".csv")
    {
        "code".to_string()
    } else if lower.ends_with(".png")
        || lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".gif")
        || lower.ends_with(".webp")
        || lower.ends_with(".svg")
        || lower.ends_with(".bmp")
        || lower.ends_with(".ico")
    {
        "image".to_string()
    } else if lower.ends_with(".pdf") {
        "pdf".to_string()
    } else {
        "text".to_string()
    }
}
```

- [ ] **Step 3: 新增 `read_file_bytes` command**

在 `read_image_base64`（184 行结束）之后插入：

```rust
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path)
        .map_err(|e| format!("Failed to read file bytes: {}", e))
}
```

注意：`base64::Engine` 已在使用（read_image_base64），`std::fs::read` 无需额外 use。

- [ ] **Step 4: 在 `invoke_handler` 注册**

把 invoke_handler 列表（`src-tauri/src/lib.rs:280-288`）改为：

```rust
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            read_document,
            get_file_metadata,
            read_image_base64,
            read_file_bytes,
            write_document,
            create_file,
            create_folder
        ])
```

- [ ] **Step 5: 运行 `cargo check` 验证 Rust 编译**

Run: `cd src-tauri && cargo check`
Expected: `Finished` 无 error。

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: add pdf file type and read_file_bytes command"
```

---

### Task 2: 前端类型与数据层接入 pdf

**Files:**
- Modify: `src/types/document.ts:1-14`
- Modify: `src/services/tauriService.ts:56-64` (在 readImageBase64 后新增 readFileBytes)
- Modify: `src/stores/documentStore.ts:1-5` (import)
- Modify: `src/stores/documentStore.ts:169-200` (`doLoadDocument` 加 pdf 分支)

**Interfaces:**
- Consumes:
  - Task 1 的 `read_file_bytes` command（invoke 返回 `number[]`）
- Produces:
  - `DocMeta.type` 联合类型增加 `'pdf'`
  - `tauriService.readFileBytes(path): Promise<ArrayBuffer>`
  - `DocContent.bytes?: ArrayBuffer`（仅 pdf 填充）
  - `doLoadDocument` 对 pdf 分支设置 `currentDoc.value = { meta, raw: '', html: '', toc: [], bytes }`

- [ ] **Step 1: `DocMeta.type` 加 `'pdf'`**

`src/types/document.ts` 第 5 行改为：

```ts
  type: 'markdown' | 'text' | 'code' | 'image' | 'pdf'
```

并在 `DocContent` 接口（约 15-20 行）加可选字段：

```ts
export interface DocContent {
  meta: DocMeta
  raw: string
  html: string
  toc: TocItem[]
  bytes?: ArrayBuffer
}
```

- [ ] **Step 2: `tauriService.ts` 加 `readFileBytes`**

在 `readImageBase64`（64 行）之后新增：

```ts
export async function readFileBytes(path: string): Promise<ArrayBuffer> {
  try {
    const arr = await invoke<number[]>('read_file_bytes', { path })
    return new Uint8Array(arr).buffer
  } catch (error) {
    console.error('Failed to read file bytes:', error)
    throw error
  }
}
```

- [ ] **Step 3: `documentStore` import 加 `readFileBytes`**

`src/stores/documentStore.ts:4` 改为：

```ts
import { scanDirectory, readDocument, getFileMetadata, readImageBase64, readFileBytes } from '@/services/tauriService'
```

- [ ] **Step 4: `doLoadDocument` 加 pdf 分支**

在 `src/stores/documentStore.ts` 的 `doLoadDocument` 里，图片分支（`if (meta.type === 'image') { ... }`，约 183-191 行）之后、`const raw = await readDocument(id)` 之前插入：

```ts
      if (meta.type === 'pdf') {
        const bytes = await readFileBytes(id)
        currentDoc.value = { meta, raw: '', html: '', toc: [], bytes }
        persistState()
        return
      }
```

- [ ] **Step 5: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无 error。

- [ ] **Step 6: Commit**

```bash
git add src/types/document.ts src/services/tauriService.ts src/stores/documentStore.ts
git commit -m "feat: add pdf type and readFileBytes to data layer"
```

---

### Task 3: ContentViewer 渲染 PDF

**Files:**
- Modify: `src/components/viewer/ContentViewer.vue:1-30` (import)
- Modify: `src/components/viewer/ContentViewer.vue:193-275` (template 加 pdf 分支)

**Interfaces:**
- Consumes:
  - Task 2 的 `currentDoc.bytes?: ArrayBuffer`、`meta.type === 'pdf'`
- Produces:
  - `OpenFileViewer` 组件渲染 pdf 分支，`pdfPlugin({ workerSrc })` 已配置

- [ ] **Step 1: 引入库与样式**

`src/components/viewer/ContentViewer.vue` 的 `<script setup>` 顶部 import 区（约 6-13 行）加：

```ts
import { OpenFileViewer } from '@open-file-viewer/vue'
import { pdfPlugin } from '@open-file-viewer/core'
import '@open-file-viewer/core/dist/style.css'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
```

同时给 script 加一个构建 pdf Blob 的 helper（放在 `getLanguageExtension` 附近）：

```ts
const pdfPlugins = [pdfPlugin({ workerSrc: pdfWorkerSrc })]

function pdfBlob(): Blob {
  const bytes = documentStore.currentDoc?.bytes
  return new Blob([bytes ?? new ArrayBuffer(0)], { type: 'application/pdf' })
}
```

- [ ] **Step 2: template 加 pdf 分支**

在现有 `<template v-if="documentStore.currentDoc.meta.type === 'image'">...</template>`（225-263 行）之后、`<template v-else>`（264 行）之前，插入独立分支：

```html
    <!-- PDF viewer -->
    <template v-else-if="documentStore.currentDoc.meta.type === 'pdf'">
      <div class="flex-1 min-h-0 overflow-hidden bg-bg">
        <OpenFileViewer
          :file="pdfBlob()"
          :file-name="documentStore.currentDoc.meta.name"
          :plugins="pdfPlugins"
          width="100%"
          height="100%"
          fit="contain"
          toolbar
          theme="auto"
          @error="handleContentError"
        />
      </div>
    </template>
```

注意：`v-else-if` 必须紧跟在 image 的 `</template>` 之后（中间不能有其他非注释节点），保证与原 `image`/`v-else` 结构不冲突。

- [ ] **Step 3: 加错误处理 handler**

在 `<script setup>` 的 `handleContentClick` 附近加：

```ts
function handleContentError(error: unknown) {
  console.error('PDF preview failed:', error)
}
```

- [ ] **Step 4: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无 error（若 `pdf.worker.mjs?url` 的模块类型缺失，需在 `src/vite-env.d.ts` 或 `src/env.d.ts` 加声明，见 Step 5）。

- [ ] **Step 5: 若报 `Cannot find module '*.mjs?url'`，补类型声明**

在 `src/vite-env.d.ts`（若不存在则新建）加：

```ts
/// <reference types="vite/client" />

declare module '*?url' {
  const src: string
  export default src
}
```

再次 Run: `npx vue-tsc --noEmit`，Expected: 无 error。

- [ ] **Step 6: Commit**

```bash
git add src/components/viewer/ContentViewer.vue src/vite-env.d.ts
git commit -m "feat: render pdf via open-file-viewer in ContentViewer"
```

---

### Task 4: 手动验证与收尾

**Files:**
- 无（验证用）

**Interfaces:**
- Consumes: Task 1-3 全部产出
- Produces: 无

- [ ] **Step 1: 类型检查全量**

Run: `npx vue-tsc --noEmit`
Expected: 无 error。

- [ ] **Step 2: Rust 编译**

Run: `cd src-tauri && cargo check`
Expected: 无 error。

- [ ] **Step 3: 手动验证**

Run: `npm run tauri dev`
- 打开一个含 `.pdf` 的文件夹 → 左侧树里出现 `.pdf` 文件且带 `PDF` 蓝色徽标（`getFileTypeBadge` 的 `case 'pdf'` 会走默认分支，显示 `PDF`）。
- 点击该文件 → 右侧渲染 PDF，可翻页/缩放。
- 点击 `.md` 文件 → Markdown 渲染、编辑、搜索高亮不受影响。
- 点击 `.png` 文件 → 图片缩放/旋转不受影响。
- 若 `getFileTypeBadge` 未覆盖 pdf，确认默认分支 `letter: ext.slice(0,3).toUpperCase()` → `PDF` 生效，无需改。

- [ ] **Step 4: 全量 build 确认无回归**

Run: `npm run build`
Expected: 成功，无类型错误。若 pdfjs worker 资源未正确打包，检查 `dist/assets` 是否含 `pdf.worker`。

- [ ] **Step 5: 提交收尾（若 Step 3/4 有改动）**

```bash
git add -A
git commit -m "fix: pdf preview polish"
```

（若无改动则跳过。）
