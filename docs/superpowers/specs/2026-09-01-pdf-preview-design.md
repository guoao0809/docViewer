# 设计：增量接入 PDF 预览

## 背景与目标

DocViewer 是基于 Tauri v2 + Vue 3 的本地文档查看器。当前 `detect_file_type` 仅识别 `markdown | code | image | text`，文本类用 markdown-it + Shiki 渲染，图片用 base64 显示——**无法预览 PDF**。

本次集成引入开源库 [open-file-viewer](https://github.com/xushanpei/open-file-viewer)（MIT，支持 110 种格式），**仅增量接入 PDF 预览**。现有 Markdown/代码/图片渲染与内联编辑、搜索高亮、TOC 面板全部保持不变。

## 范围

**做**：识别 `.pdf` 文件类型，读取本地文件字节，用 `@open-file-viewer/vue` 的 `OpenFileViewer` 组件渲染 PDF。

**不做**（后续再说）：Office（Word/Excel/PPT）、CAD/DWG、3D、GIS 等格式；整体替换现有 `ContentViewer` 管线；OCR。

## 关键决策

1. **用 pnpm 安装依赖**：`@open-file-viewer/core`、`@open-file-viewer/vue`、`pdfjs-dist`。
2. **PDF 文件输入方式**：库接受 `File`/`Blob`/`ArrayBuffer`/URL。选用**新增 Rust command `read_file_bytes` 返回 `Vec<u8>`（ArrayBuffer）** 的方式，而非 Tauri asset protocol URL。理由：无需额外配置 `assetProtocol` scope，读写统一走自定义 command，最贴合离线桌面场景且不受插件 scope 限制。
3. **本次只接 PDF**，范围最小，能快速跑通验证。

## 架构

### 1. Rust 后端（`src-tauri/src/lib.rs`）

- 新增 command `read_file_bytes(path: String) -> Result<Vec<u8>, String>`：读取文件原始字节返回前端（ArrayBuffer）。
- `detect_file_type` 增加 `.pdf` → `pdf` 分支。
- 在 `invoke_handler` 注册 `read_file_bytes`。

### 2. 前端数据层

- `src/types/document.ts`：`DocMeta.type` 联合类型增加 `'pdf'`。
- `src/services/tauriService.ts`：新增 `readFileBytes(path): Promise<ArrayBuffer>`，通过 `invoke<number[]>('read_file_bytes', { path })` 并将 `Uint8Array` 转为 `ArrayBuffer`。
- `src/stores/documentStore.ts`：`doLoadDocument` 增加 pdf 分支——读取字节存入 `currentDoc`。

> `DocContent` 结构：pdf 分支设置 `raw` 为空字符串，新增字段（如 `rawBytes` 或复用 `raw` 的 base64？）承载字节。设计取舍：为最小侵入，新增一个可选字段 `bytes?: ArrayBuffer`（或 `Uint8Array`），仅在 pdf 分支填充，其他分支保持 undefined。

### 3. 视图层（`src/components/viewer/ContentViewer.vue`）

增加 `meta.type === 'pdf'` 分支，渲染 `OpenFileViewer`：

```ts
import { OpenFileViewer } from '@open-file-viewer/vue'
import { pdfPlugin } from '@open-file-viewer/core'
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url'
```

- 由字节构造 `File`/`Blob` 传给组件。
- `pdfPlugin({ workerSrc: pdfWorkerSrc })` 配置 PDF.js worker。
- 若渲染需要 `file` 为 `File`/`Blob`，则在组件内用 `new Blob([bytes], { type: 'application/pdf' })` 构造。

### 4. 依赖与构建

- `pnpm add @open-file-viewer/core @open-file-viewer/vue pdfjs-dist`
- `pdf.worker.mjs?url` 依赖 Vite 的 URL 导入（`?url` 后缀），Vite 默认支持，无需额外配置。
- CSS：`@open-file-viewer/core/style.css`（如库要求）。

## 数据流

点击 `.pdf` 文件 → `doLoadDocument(id)` → 匹配 `type === 'pdf'` → `readFileBytes(path)` 返回 `ArrayBuffer` → 存进 `currentDoc.bytes` → `ContentViewer` 检测到 pdf 分支 → `new Blob([bytes])` → `<OpenFileViewer :file="blob" :file-name="..." :plugins="[pdfPlugin({workerSrc})]" />` 渲染。

## 错误处理

- `read_file_bytes` 失败：捕获异常，`currentDoc` 置空或显示可读错误占位，不崩溃。
- 未安装/加载 worker 失败：库抛出错误时走 `on-error` 回调显示占位。

## 测试

项目无既有测试设施。验证方式：
1. `npx vue-tsc --noEmit` 类型检查通过。
2. 手动验证：打开一个 `.pdf` 文件能渲染、翻页、缩放；非 pdf 文件行为不变。

## 风险与回归

- `DocMeta.type` 联合类型扩字段，需确保所有 `currentDoc.meta.type` 的运行时判断（`!== 'image'` 等）不受影响——pdf 分支单独处理，图片分支仍走原逻辑。
- PDF.js worker 资源在生产 `tauri build` 时要正确打包（`?url` 导入 + Vite build 会处理资源拷贝）。
