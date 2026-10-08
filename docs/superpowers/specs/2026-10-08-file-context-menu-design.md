# 设计：文件列表右键菜单

## 背景与目标

DocViewer 左侧文件树（`DocTreeRecursive.vue`）目前只有：点击打开、内联新建、根文件夹「移除」按钮。缺少文件管理操作。

本设计为文件树节点增加 **右键菜单**，提供四项操作：复制文件路径、重命名、删除（回收站）、在文件资源管理器中显示。

## 范围

**做**：文件与文件夹节点的右键菜单；四项操作；重命名后同步更新所有引用；删除文件夹前确认。

**不做**：复制/剪切文件再粘贴（VSCode 式文件剪贴板，本次不做）；拖拽移动；新建已有功能不动。

## 关键决策（已与用户确认）

1. **删除** → 移到**系统回收站**（可恢复），用 Rust `trash` crate。
2. **范围** → **文件和文件夹都支持**右键菜单。
3. **复制文件路径** → 用官方 **`@tauri-apps/plugin-clipboard-manager`** 写系统剪贴板。
4. **在文件资源管理器中显示** → 用已引入的 **`@tauri-apps/plugin-opener`** 的 `revealItemInDir(path)`。
5. **重命名** → 行内编辑（复用现有新建文件的 `<input>` 模式），改名后**同步更新所有引用**（docTree 路径、子节点前缀、currentDoc、openedDocs、rootPaths），避免已打开文档路径失效。
6. **菜单实现** → 自建轻量 `ContextMenu.vue`（Teleport + 坐标定位），需求仅 4 项，不封装 reka-ui 的 6 个 shadcn 原语。

## 架构

### 依赖（新增）

- Rust：`trash = "5"`（回收站）；`tauri-plugin-clipboard-manager = "2"`
- JS：`@tauri-apps/plugin-clipboard-manager`
- 已有：`tauri-plugin-opener`（上一功能引入）

> `trash` 的实际主版本以 `cargo add trash` 落定为准；若 API 与 `trash::delete(path)` 有出入，以 `cargo check` 实测调整。

### Rust 后端（`src-tauri/src/lib.rs`）

新增两个命令 + 注册 clipboard 插件：

- `rename_path(path: String, new_name: String) -> Result<String, String>`
  同目录改名，返回**新路径**。目标已存在同名时返回错误。
- `trash_path(path: String) -> Result<(), String>`
  将文件/文件夹移入系统回收站。
- `.plugin(tauri_plugin_clipboard_manager::init())`
- 两个命令注册进 `invoke_handler`。

### 权限（`src-tauri/capabilities/default.json`）

新增：
- `clipboard-manager:allow-write-text`
- `opener:allow-reveal-item-in-dir`

（已有 `opener:allow-open-url` / `opener:allow-default-urls` 保留。）

### 前端服务（`src/services/tauriService.ts`）

- `renamePath(path, newName): Promise<string>`
- `trashPath(path): Promise<void>`
- （复制路径与 reveal 直接用插件 API，不经 tauriService。）

### Store 动作（`src/stores/documentStore.ts`）

新增 UI 状态 `contextMenu: { visible: boolean; x: number; y: number; nodeId: string | null }`，
以及 `doOpenContextMenu(x, y, nodeId)` / `doCloseContextMenu()`。

动作：
- `doCopyPath(id)` —— `writeText(node.path)` 写入系统剪贴板。
- `doRevealInExplorer(id)` —— `revealItemInDir(node.path)`。
- `doRenameNode(id, newName)` ——
  1. 计算 `newPath`（父目录 + newName），调用 `renamePath`。
  2. 更新该节点 `path`/`name`；递归更新其所有子节点 `path` 前缀。
  3. 若匹配 `currentDoc.meta.id`，同步更新 `currentDoc`。
  4. 更新 `openedDocs` 中对应项、`activeDocId`。
  5. 若该节点是根路径（在 `rootPaths` 中），同步更新 `rootPaths`。
  6. `persistState()`。
- `doTrashNode(id)` —— 调用 `trashPath`；从 `docTree` 移除该节点（若是根则一并移出 `rootPaths`）；若删的是当前打开文档则清空 `currentDoc`；`persistState()` + 重建搜索索引。

### UI

新建 `src/components/ui/ContextMenu.vue`：
- Props：`x: number`、`y: number`、`items: { key: string; label: string; danger?: boolean; action: () => void }[]`
- Emits：`close`
- Teleport 到 `body`，绝对定位在 `(x, y)`；查看窗口边界做翻转；点击外部 / `Esc` / 窗口 blur 时 `emit('close')`。

`DocTreeRecursive.vue`：
- 节点根 `<div>` 加 `@contextmenu.prevent="openMenu($event, doc)"`（走 store 的 `doOpenContextMenu`）。
- 重命名：新增局部 `renaming` 状态，复用现有 `<input>` 模式（与 `isCreating` 平行），Enter 提交、Esc 取消。
- 四项操作对文件与文件夹均适用。

菜单挂载点：在 `DocTree.vue` 顶层渲染一次 `<ContextMenu>`，读 store 的 `contextMenu` 状态，避免递归组件里多实例。

### 安全

删除**文件夹**（尤其根文件夹）前，使用现有 `ConfirmDialog` 二次确认，避免误删整个项目目录。

## 数据流

右键节点 → `doOpenContextMenu(e.clientX, e.clientY, doc.id)` → `ContextMenu` 渲染 → 选中菜单项 → 调用对应 store 动作 → Rust 命令 / 插件 → 刷新树 + `persistState`。

## 错误处理

- `renamePath` / `trashPath` 失败（权限、占用、同名）→ `catch` 后 `console.error`，不崩溃；同名冲突不改动原文件。
- `revealItemInDir` / `writeText` 失败 → `catch` + 日志。

## 验证

项目无测试设施。验证方式：
1. `npx vue-tsc --noEmit` 类型检查通过。
2. `cd src-tauri && cargo check` 通过。
3. `pnpm run build` 成功。
4. 手动：右键文件/文件夹 → 四项操作分别生效；重命名后已打开文档仍可编辑保存；删除进入回收站；「在文件资源管理器中显示」定位到文件。
