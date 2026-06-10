# DocViewer 文件/文件夹创建与选中管理设计文档

> 在侧边栏树中选中节点后创建文件/文件夹，支持内联输入名称，支持一键折叠全部文件夹。

## 概述

**目标**：支持在已打开的文件夹树中创建新文件和新文件夹（在选中的节点下）。提供全折叠文件夹功能。

- **创建文件**：选中文件夹节点 → 点击按钮 → 内联输入文件名（含后缀）→ Enter 创建空文件
- **创建文件夹**：同上，创建目录
- **收起文件夹**：一键折叠所有已展开的文件夹
- **按钮禁用**：未选中任何节点时，创建按钮禁用

## 交互设计

### 选中状态

```
documentStore.selectedNodeId: string | null
```

- 点击树中文件夹节点 → `selectedNodeId = doc.id`，节点蓝底高亮
- 点击树中文件节点 → `selectedNodeId = doc.id`，新建操作在该文件所在目录下进行
- 新建成功/取消后 → `selectedNodeId` 保持不变（不清除）

### 内联输入

点击「新增文件」或「新增文件夹」按钮后，在选中节点的子列表末尾（文件夹情况）或同级（文件情况）出现内联 `<input>`：

```
▼ 项目B    ← 选中 (selectedNodeId)
  ├─ readme.md
  ├─ config.json
  │  ┌──────────────────┐
  │  │ 新文件.md    [✓]  │  ← 内联 input + Enter 确认
  │  └──────────────────┘
  └─ src/
```

- **Enter**：调用 Rust 命令创建文件/文件夹 → 刷新父节点子列表
- **Escape**：取消，移除输入框

### 按钮栏

Sidebar 顶部「项目」行右侧改为三个按钮：

```
项目    [📁新建文件夹] [📄新建文件] [↻收起] [X删除]
```

| 按钮 | 禁用条件 |
|---|---|
| 新建文件夹 | `!selectedNodeId` |
| 新建文件 | `!selectedNodeId` |
| 收起文件夹 | `expandedDirs.size === 0` |

删除按钮保留原有逻辑（仅根文件夹可见/hover 显示）。

## Rust 后端

### 新增命令

```rust
#[tauri::command]
fn create_file(path: String, name: String) -> Result<String, String> {
    let full = Path::new(&path).join(&name);
    fs::write(&full, b"").map_err(|e| format!("...: {}", e))?;
    Ok(full.to_string_lossy().to_string())
}

#[tauri::command]
fn create_folder(path: String, name: String) -> Result<String, String> {
    let full = Path::new(&path).join(&name);
    fs::create_dir(&full).map_err(|e| format!("...: {}", e))?;
    Ok(full.to_string_lossy().to_string())
}
```

## 前端

### documentStore 新增

```typescript
const selectedNodeId = ref<string | null>(null)

function doSelectNode(id: string) { selectedNodeId.value = id }
function doClearSelection() { selectedNodeId.value = null }

function doCollapseAll() { expandedDirs.value = new Set() }

async function doCreateFile(parentPath: string, name: string): Promise<string> {
  return await invoke('create_file', { path: parentPath, name })
}

async function doCreateFolder(parentPath: string, name: string): Promise<string> {
  return await invoke('create_folder', { path: parentPath, name })
}
```

### DocTreeRecursive 改动

- 节点点击时调用 `documentStore.doSelectNode(doc.id)`
- 当 `createMode` 激活且当前节点为选中节点时，渲染内联 `<input>`
- 新增 prop `createMode: 'file' | 'folder' | null`
- Enter → 调用 create，Escape → emit cancel

### Sidebar 改动

- 项目行右侧增加「新建文件夹」「新建文件」「收起」按钮
- 管理 `createMode` 状态
- 按钮 disabled 逻辑

## 边界情况

| 场景 | 处理 |
|---|---|
| 选中节点被删除（移除根文件夹） | `selectedNodeId` 置 null |
| 创建文件时名称重复 | Rust 返回错误 → 前端提示 |
| 在文件节点下创建 | 取 `parentPath = path.dirname(selectedNode.path)` |
| 未打开任何文件夹 | `selectedNodeId` 为 null，按钮禁用 |
| 内联输入时点击其他节点 | 先取消当前输入，再选中新节点 |

## 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 修改 | `src-tauri/src/lib.rs` | 新增 `create_file`、`create_folder` 命令 |
| 修改 | `src/services/tauriService.ts` | 新增 `createFile`、`createFolder` 函数 |
| 修改 | `src/stores/documentStore.ts` | 新增 selectedNodeId + 创建/折叠方法 |
| 修改 | `src/components/layout/Sidebar.vue` | 项目行按钮组 |
| 修改 | `src/components/sidebar/DocTreeRecursive.vue` | 选中高亮 + 内联输入 |
