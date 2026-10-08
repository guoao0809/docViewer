# 文件列表右键菜单 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给左侧文件树节点增加右键菜单：复制文件路径、在文件资源管理器中显示、重命名、删除（回收站）。

**Architecture:** Rust 新增 `rename_path` / `trash_path` 两个命令并注册 clipboard-manager 插件；前端 store 增加菜单 UI 状态与四个动作；新建轻量 `ContextMenu.vue`（Teleport + 坐标定位）在 `DocTree.vue` 顶层渲染一次；`DocTreeRecursive.vue` 节点上挂 `@contextmenu` 并支持行内重命名。

**Tech Stack:** Tauri v2、Vue 3 + TS、`trash` crate 5.x、`tauri-plugin-clipboard-manager` 2.x、`tauri-plugin-opener`（已引入）。

## Global Constraints

- 文件节点 id 即其绝对路径（`id === path`）——重命名时两者都要更新。
- 删除**一律**先弹 `ConfirmDialog` 确认（比 spec 更保守：文件夹与文件都确认，避免误删）。使用 `<ConfirmDialog :danger="true">`（默认）。
- `rename-path` 目标已存在同名项时**返回 Err**，不覆盖。
- 重命名必须同步更新：该节点及子树的 `id`/`path`、该节点的 `name`、`rootPaths`、`activeDocId`。
- 菜单是自建组件，**不引入 reka-ui 的 ContextMenu 封装**。
- 命令命名沿用 snake_case：`rename_path`、`trash_path`；JS 侧 invoke 传 camelCase 参数 `{ path, newName }`。
- 类型检查：`npx vue-tsc --noEmit`；Rust 检查：`cd src-tauri && cargo check`。

---

### Task 1: Rust 后端——回收站与重命名命令

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

**Interfaces:**
- Consumes: 无
- Produces:
  - command `rename_path(path: String, new_name: String) -> Result<String, String>`（返回新路径；同名返回 Err）
  - command `trash_path(path: String) -> Result<(), String>`
  - clipboard-manager 插件已注册；权限含 `clipboard-manager:allow-write-text`、`opener:allow-reveal-item-in-dir`

- [ ] **Step 1: 加 Rust 依赖**

`src-tauri/Cargo.toml` 的 `[dependencies]` 里，`tauri-plugin-dialog = "2"` 之后加：

```toml
tauri-plugin-clipboard-manager = "2"
```

并在 `walkdir = "2"` 之后加：

```toml
trash = "5"
```

- [ ] **Step 2: 新增两个命令**

`src-tauri/src/lib.rs` 中，在 `create_folder` 命令之后（`pub fn run()` 之前）插入：

```rust
#[tauri::command]
fn rename_path(path: String, new_name: String) -> Result<String, String> {
    let src = Path::new(&path);
    let parent = src
        .parent()
        .ok_or_else(|| "Invalid path: no parent directory".to_string())?;
    let dest = parent.join(&new_name);
    if dest.exists() {
        return Err(format!("目标已存在同名项：{}", new_name));
    }
    fs::rename(src, &dest).map_err(|e| format!("Failed to rename: {}", e))?;
    Ok(dest.to_string_lossy().to_string())
}

#[tauri::command]
fn trash_path(path: String) -> Result<(), String> {
    trash::delete(&path).map_err(|e| format!("Failed to move to trash: {}", e))
}
```

- [ ] **Step 3: 注册 clipboard 插件**

`src-tauri/src/lib.rs` 的 `tauri::Builder::default()` 链中，`.plugin(tauri_plugin_opener::init())` 之后加：

```rust
        .plugin(tauri_plugin_clipboard_manager::init())
```

- [ ] **Step 4: 注册命令**

`invoke_handler` 列表里，`create_folder` 之后加：

```rust
            rename_path,
            trash_path
```

（注意前一项 `create_folder` 后补逗号。）

- [ ] **Step 5: 加权限**

`src-tauri/capabilities/default.json` 的 `permissions` 数组，在 `"opener:allow-default-urls"` 之后加：

```json
    "clipboard-manager:allow-write-text",
    "opener:allow-reveal-item-in-dir"
```

- [ ] **Step 6: 验证编译**

Run: `cd src-tauri && cargo check`
Expected: `Finished` 无 error（首次会拉取 trash / clipboard-manager crate）。

- [ ] **Step 7: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat: add rename_path and trash_path commands, register clipboard plugin"
```

---

### Task 2: 前端服务层

**Files:**
- Modify: `package.json`（安装依赖）
- Modify: `src/services/tauriService.ts`

**Interfaces:**
- Consumes: Task 1 的 `rename_path` / `trash_path`
- Produces:
  - `renamePath(path: string, newName: string): Promise<string>`
  - `trashPath(path: string): Promise<void>`

- [ ] **Step 1: 安装剪贴板插件**

Run: `pnpm add @tauri-apps/plugin-clipboard-manager`
Expected: 写入 `package.json` dependencies。

- [ ] **Step 2: 加服务函数**

`src/services/tauriService.ts` 末尾（`createFolder` 之后）加：

```ts
/** 同目录重命名，返回新路径 */
export async function renamePath(path: string, newName: string): Promise<string> {
  try {
    return await invoke<string>('rename_path', { path, newName })
  } catch (error) {
    console.error('Failed to rename:', error)
    throw error
  }
}

/** 将文件/文件夹移入系统回收站 */
export async function trashPath(path: string): Promise<void> {
  try {
    await invoke('trash_path', { path })
  } catch (error) {
    console.error('Failed to move to trash:', error)
    throw error
  }
}
```

- [ ] **Step 3: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无 error。

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/services/tauriService.ts
git commit -m "feat: add renamePath/trashPath service wrappers"
```

---

### Task 3: Store 状态与动作

**Files:**
- Modify: `src/stores/documentStore.ts`

**Interfaces:**
- Consumes: Task 2 的 `renamePath` / `trashPath`；`@tauri-apps/plugin-clipboard-manager` 的 `writeText`；`@tauri-apps/plugin-opener` 的 `revealItemInDir`
- Produces（store 导出）：
  - `contextMenu`（`{ visible, x, y, nodeId }`）、`doOpenContextMenu(x, y, nodeId)`、`doCloseContextMenu()`
  - `renamingNodeId`、`doStartRename(id)`、`doCancelRename()`
  - `pendingTrashId`、`pendingTrashName`、`doRequestTrash(id)`、`doConfirmTrash()`、`doCancelTrash()`
  - `doCopyPath(id)`、`doRevealInExplorer(id)`、`doRenameNode(id, newName)`

- [ ] **Step 1: 加 import**

`src/stores/documentStore.ts` 顶部，现有 tauriService import 行改为：

```ts
import { scanDirectory, readDocument, getFileMetadata, readFileBytes, renamePath, trashPath } from '@/services/tauriService'
```

并在其下加：

```ts
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
```

- [ ] **Step 2: 加 UI 状态**

在 `const pendingRemoveName = ref('')` 之后加：

```ts
  // 右键菜单状态
  const contextMenu = ref<{ visible: boolean; x: number; y: number; nodeId: string | null }>({
    visible: false, x: 0, y: 0, nodeId: null,
  })
  const renamingNodeId = ref<string | null>(null)
  const pendingTrashId = ref<string | null>(null)
  const pendingTrashName = ref('')
```

- [ ] **Step 3: 加动作函数**

在 `doRemoveOpenedDoc` 函数之后插入：

```ts
  function doOpenContextMenu(x: number, y: number, nodeId: string) {
    contextMenu.value = { visible: true, x, y, nodeId }
  }

  function doCloseContextMenu() {
    contextMenu.value = { visible: false, x: 0, y: 0, nodeId: null }
  }

  function doStartRename(id: string) { renamingNodeId.value = id }
  function doCancelRename() { renamingNodeId.value = null }

  /** 复制节点完整路径到系统剪贴板 */
  async function doCopyPath(id: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    try {
      await writeText(node.path)
    } catch (e) {
      console.error('Failed to copy path:', e)
    }
  }

  /** 在系统文件管理器中定位该节点 */
  async function doRevealInExplorer(id: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    try {
      await revealItemInDir(node.path)
    } catch (e) {
      console.error('Failed to reveal in explorer:', e)
    }
  }

  /** 重命名：改名并同步更新子树 id/path、rootPaths、activeDocId */
  async function doRenameNode(id: string, newName: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    const trimmed = newName.trim()
    if (!trimmed || trimmed === node.name) { renamingNodeId.value = null; return }

    let newPath: string
    try {
      newPath = await renamePath(id, trimmed)
    } catch (e) {
      console.error('Rename failed:', e)
      renamingNodeId.value = null
      return
    }

    const oldPath = node.path
    const remap = (n: DocMeta) => {
      n.id = newPath + n.id.slice(oldPath.length)
      n.path = n.id
      n.children?.forEach(remap)
    }
    remap(node)
    node.name = trimmed

    const idx = rootPaths.value.indexOf(oldPath)
    if (idx >= 0) rootPaths.value[idx] = newPath
    if (activeDocId.value && (activeDocId.value === oldPath || activeDocId.value.startsWith(oldPath + '/') || activeDocId.value.startsWith(oldPath + '\\'))) {
      activeDocId.value = newPath + activeDocId.value.slice(oldPath.length)
    }

    renamingNodeId.value = null
    docTree.value = [...docTree.value]
    persistState()
  }

  /** 删除：弹确认 */
  function doRequestTrash(id: string) {
    const node = findDocById(id, docTree.value)
    if (!node) return
    pendingTrashId.value = id
    pendingTrashName.value = node.name
  }

  function doCancelTrash() {
    pendingTrashId.value = null
    pendingTrashName.value = ''
  }

  /** 确认删除：移入回收站并从树中移除 */
  async function doConfirmTrash() {
    const id = pendingTrashId.value
    pendingTrashId.value = null
    pendingTrashName.value = ''
    if (!id) return

    try {
      await trashPath(id)
    } catch (e) {
      console.error('Trash failed:', e)
      return
    }

    if (currentDoc.value && (currentDoc.value.meta.id === id || currentDoc.value.meta.id.startsWith(id + '/') || currentDoc.value.meta.id.startsWith(id + '\\'))) {
      currentDoc.value = null
      activeDocId.value = null
    }
    if (activeDocId.value === id) activeDocId.value = null

    if (rootPaths.value.includes(id)) {
      rootPaths.value = rootPaths.value.filter(p => p !== id)
      docTree.value = docTree.value.filter(d => d.id !== id)
      expandedDirs.value.delete(id)
      expandedDirs.value = new Set(expandedDirs.value)
      persistState()
      useSearchStore().doBuildIndex()
    } else {
      const parentPath = getParentPath(id)
      await doRefreshChildren(parentPath)
    }
  }
```

- [ ] **Step 4: 导出新增项**

`return { ... }` 里，在 `pendingRemoveId, pendingRemoveName,` 一行后补：

```ts
    contextMenu, doOpenContextMenu, doCloseContextMenu,
    renamingNodeId, doStartRename, doCancelRename,
    pendingTrashId, pendingTrashName, doRequestTrash, doConfirmTrash, doCancelTrash,
    doCopyPath, doRevealInExplorer, doRenameNode,
```

- [ ] **Step 5: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无 error（`DocMeta` 已在文件顶部 import）。

- [ ] **Step 6: Commit**

```bash
git add src/stores/documentStore.ts
git commit -m "feat: add context-menu state and file actions to document store"
```

---

### Task 4: ContextMenu 组件

**Files:**
- Create: `src/components/ui/ContextMenu.vue`

**Interfaces:**
- Consumes: 无
- Produces: 组件 `ContextMenu`，props `{ x: number; y: number; items: MenuItem[] }`，emit `close`
  - `MenuItem = { key: string; label: string; danger?: boolean; action: () => void }`

- [ ] **Step 1: 新建组件**

创建 `src/components/ui/ContextMenu.vue`：

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

interface MenuItem {
  key: string
  label: string
  danger?: boolean
  action: () => void
}

const props = defineProps<{
  x: number
  y: number
  items: MenuItem[]
}>()

const emit = defineEmits<{ close: [] }>()

const menuRef = ref<HTMLElement | null>(null)
const pos = ref({ left: props.x, top: props.y })

function close() { emit('close') }

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) close()
}
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
function onViewportChange() { close() }

onMounted(() => {
  const el = menuRef.value
  if (el) {
    const rect = el.getBoundingClientRect()
    let left = props.x
    let top = props.y
    if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 4
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 4
    pos.value = { left: Math.max(4, left), top: Math.max(4, top) }
  }
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('blur', onViewportChange)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('blur', onViewportChange)
  window.removeEventListener('resize', onViewportChange)
})

function handleItem(item: MenuItem) {
  item.action()
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuRef"
      class="fixed z-50 min-w-[160px] rounded-md border border-border bg-surface py-1 shadow-xl select-none"
      :style="{ left: pos.left + 'px', top: pos.top + 'px' }"
    >
      <button
        v-for="item in items"
        :key="item.key"
        class="flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-hover"
        :class="item.danger ? 'text-red-500' : 'text-text'"
        @click="handleItem(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>
```

- [ ] **Step 2: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无 error。

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ContextMenu.vue
git commit -m "feat: add lightweight ContextMenu component"
```

---

### Task 5: 接入文件树

**Files:**
- Modify: `src/components/sidebar/DocTreeRecursive.vue`
- Modify: `src/components/sidebar/DocTree.vue`

**Interfaces:**
- Consumes: Task 3 的 store 动作；Task 4 的 `ContextMenu`
- Produces: 节点右键唤出菜单；行内重命名

- [ ] **Step 1: DocTreeRecursive —— 右键唤出菜单**

在 `handleClick` 函数之后加：

```ts
function handleContextMenu(e: MouseEvent, doc: DocMeta) {
  documentStore.doSelectNode(doc.id)
  documentStore.doOpenContextMenu(e.clientX, e.clientY, doc.id)
}
```

- [ ] **Step 2: DocTreeRecursive —— 重命名状态**

在 `const newName = ref('')`（新建用）之后加：

```ts
const renameName = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)
const isRenaming = computed(() => documentStore.renamingNodeId === props.doc.id)

watch(isRenaming, async (val) => {
  if (val) {
    renameName.value = props.doc.name
    await nextTick()
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  }
})

async function handleRenameSubmit() {
  await documentStore.doRenameNode(props.doc.id, renameName.value)
}
```

- [ ] **Step 3: DocTreeRecursive —— 节点挂 contextmenu**

节点根 `<div>` 的 `@click="handleClick(doc)"` 之后加一行：

```html
      @contextmenu.prevent="handleContextMenu($event, doc)"
```

- [ ] **Step 4: DocTreeRecursive —— 行内重命名输入**

文件节点的 `<span class="truncate" :title="doc.name">{{ truncateMiddle(doc.name) }}</span>` 用条件替换为输入框：把该 `<template v-else>` 分支里的 span 改为：

```html
        <input
          v-if="isRenaming"
          ref="renameInputRef"
          v-model="renameName"
          type="text"
          class="flex-1 min-w-0 bg-transparent border-b border-primary text-sm text-text outline-none px-1"
          @click.stop
          @keydown.enter.prevent="handleRenameSubmit"
          @keydown.esc="documentStore.doCancelRename()"
          @blur="documentStore.doCancelRename()"
        />
        <span v-else class="truncate" :title="doc.name">{{ truncateMiddle(doc.name) }}</span>
```

文件夹节点的 `<span class="truncate text-[16px] font-medium">…</span>` 同样处理：在其前加一个 `v-if="isRenaming"` 的 `<input>`（结构与上面一致，class 用 `flex-1 min-w-0`），原 span 加 `v-else`。

- [ ] **Step 5: DocTree —— 顶层渲染菜单**

`src/components/sidebar/DocTree.vue` 的 `<script setup>` 里加：

```ts
import ContextMenu from '@/components/ui/ContextMenu.vue'
```

并在 computed 区加：

```ts
const menuItems = computed(() => {
  const id = documentStore.contextMenu.nodeId
  if (!id) return []
  return [
    { key: 'copy-path', label: '复制文件路径', action: () => documentStore.doCopyPath(id) },
    { key: 'reveal', label: '在文件资源管理器中显示', action: () => documentStore.doRevealInExplorer(id) },
    { key: 'rename', label: '重命名', action: () => documentStore.doStartRename(id) },
    { key: 'delete', label: '删除', danger: true, action: () => documentStore.doRequestTrash(id) },
  ]
})
```

模板里（`</div>` 收尾之前）加：

```html
    <ContextMenu
      v-if="documentStore.contextMenu.visible"
      :x="documentStore.contextMenu.x"
      :y="documentStore.contextMenu.y"
      :items="menuItems"
      @close="documentStore.doCloseContextMenu()"
    />
```

- [ ] **Step 6: 删除确认弹窗**

`DocTree.vue` 模板末尾加：

```html
    <ConfirmDialog
      :open="documentStore.pendingTrashId !== null"
      title="确认删除"
      :description="`确定要把「${documentStore.pendingTrashName}」移入回收站吗？`"
      @confirm="documentStore.doConfirmTrash()"
      @cancel="documentStore.doCancelTrash()"
    />
```

并在 script 里加 `import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'`。

- [ ] **Step 7: 类型检查**

Run: `npx vue-tsc --noEmit`
Expected: 无 error。

- [ ] **Step 8: Commit**

```bash
git add src/components/sidebar/DocTreeRecursive.vue src/components/sidebar/DocTree.vue
git commit -m "feat: wire context menu into file tree (copy path/rename/trash/reveal)"
```

---

### Task 6: 验证收尾

**Files:** 无（验证）

- [ ] **Step 1: 全量类型检查 + 构建**

Run: `npx vue-tsc --noEmit && pnpm run build`
Expected: 均成功。

- [ ] **Step 2: Rust 编译**

Run: `cd src-tauri && cargo check`
Expected: 无 error。

- [ ] **Step 3: 手动验证**

Run: `pnpm run tauri dev`
- 右键文件 → 菜单四项：复制路径（粘贴验证内容）、在资源管理器中显示（定位到文件）、重命名（行内输入，Enter 提交）、删除（弹确认 → 进回收站）。
- 右键文件夹 → 同上四项可用。
- 重命名**已打开**的文件后：右侧文档仍正常显示，编辑并保存到新路径成功。
- 重命名同名 → 提示失败，原文件不变（看控制台）。

- [ ] **Step 4: 提交收尾（如有微调）**

```bash
git add -A
git commit -m "fix: context menu polish"
```
