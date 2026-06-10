# 文件/文件夹创建与选中管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 点击树节点选中后，通过内联输入创建新文件/文件夹，支持一键折叠全部文件夹。

**Architecture:** Rust 新增 `create_file`/`create_folder` 命令，`documentStore` 新增 `selectedNodeId` 状态和创建/折叠方法，`DocTreeRecursive` 支持选中高亮和内联 `<input>`，`Sidebar` 新增按钮组。

**Tech Stack:** Vue 3 + TypeScript + Pinia 3 + Tauri v2 + Tailwind CSS 4

---

### Task 1: Rust 后端 — `create_file` / `create_folder` 命令

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 添加 `create_file` 和 `create_folder` 函数**

在 `write_document` 函数之后、`run` 函数之前添加：

```rust
#[tauri::command]
fn create_file(path: String, name: String) -> Result<String, String> {
    let full = Path::new(&path).join(&name);
    fs::write(&full, b"")
        .map_err(|e| format!("Failed to create file: {}", e))?;
    Ok(full.to_string_lossy().to_string())
}

#[tauri::command]
fn create_folder(path: String, name: String) -> Result<String, String> {
    let full = Path::new(&path).join(&name);
    fs::create_dir(&full)
        .map_err(|e| format!("Failed to create folder: {}", e))?;
    Ok(full.to_string_lossy().to_string())
}
```

- [ ] **Step 2: 注册命令到 `invoke_handler`**

将：
```rust
.invoke_handler(tauri::generate_handler![
    scan_directory,
    read_document,
    get_file_metadata,
    write_document
])
```

改为：
```rust
.invoke_handler(tauri::generate_handler![
    scan_directory,
    read_document,
    get_file_metadata,
    write_document,
    create_file,
    create_folder
])
```

- [ ] **Step 3: 构建 Rust 并提交**

```bash
cargo build --manifest-path src-tauri/Cargo.toml
git add src-tauri/src/lib.rs
git commit -m "feat: add create_file and create_folder commands"
```

---

### Task 2: 前端服务 — `createFile` / `createFolder`

**Files:**
- Modify: `src/services/tauriService.ts`

- [ ] **Step 1: 在 `writeDocument` 之后添加两个新函数**

```typescript
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
```

- [ ] **Step 2: 构建验证并提交**

```bash
npm run build
git add src/services/tauriService.ts
git commit -m "feat: add createFile and createFolder service functions"
```

---

### Task 3: documentStore — selectedNodeId + 创建/折叠方法

**Files:**
- Modify: `src/stores/documentStore.ts`

- [ ] **Step 1: 新增 state 和方法**

在 `const activeDocId = ref<string | null>(null)` 之后添加：

```typescript
const selectedNodeId = ref<string | null>(null)
```

在 `doToggleExpanded` 函数之后添加以下方法：

```typescript
function doSelectNode(id: string) { selectedNodeId.value = id }

function doCollapseAll() {
  expandedDirs.value = new Set()
  persistState()
}

/** Find the parent path for a given node id */
function getParentPath(id: string): string {
  const doc = findDocById(id, docTree.value)
  if (!doc) return ''
  // Path is the node's path; for files use its parent dir, for folders use the folder itself
  if (doc.children) return doc.path // folder → create inside it
  // file → create in its parent dir
  const p = doc.path.replaceAll('\\', '/')
  const lastSep = p.lastIndexOf('/')
  return lastSep > 0 ? p.substring(0, lastSep) : p
}

/** Refresh all children of a node by re-scanning its path */
async function doRefreshChildren(parentId: string) {
  const parent = findDocById(parentId, docTree.value)
  if (!parent || !parent.children) return
  // Re-scan the parent directory to get updated children
  try {
    const fresh = await scanDirectory(parent.path)
    const persisted = getPersistedDocMetaMap()
    mergePersistedIntoTree(fresh, persisted)
    parent.children = fresh
    // Force reactivity
    docTree.value = [...docTree.value]
    persistState()
    const searchStore = useSearchStore()
    searchStore.doBuildIndex()
  } catch (err) {
    console.error('Failed to refresh children:', err)
  }
}

async function doCreateFile(parentPath: string, name: string): Promise<string> {
  const { createFile } = await import('@/services/tauriService')
  return await createFile(parentPath, name)
}

async function doCreateFolder(parentPath: string, name: string): Promise<string> {
  const { createFolder } = await import('@/services/tauriService')
  return await createFolder(parentPath, name)
}
```

- [ ] **Step 2: 更新 `doRemoveRootFolder` — 清除选中**

在 `doRemoveRootFolder` 函数开头添加：

```typescript
// 如果删除的是当前选中节点或其祖先，清除选中
if (selectedNodeId.value && (selectedNodeId.value === id || selectedNodeId.value.startsWith(id))) {
  selectedNodeId.value = null
}
```

- [ ] **Step 3: 更新 return 对象**

在 return 中添加新成员：

```typescript
selectedNodeId,
doSelectNode, doCollapseAll, getParentPath, doRefreshChildren,
doCreateFile, doCreateFolder,
```

- [ ] **Step 4: 构建验证并提交**

```bash
npm run build
git add src/stores/documentStore.ts
git commit -m "feat: add selectedNodeId, create file/folder, collapse all to documentStore"
```

---

### Task 4: DocTreeRecursive — 选中高亮 + 内联输入

**Files:**
- Modify: `src/components/sidebar/DocTreeRecursive.vue`

这是最复杂的任务。需要：选中高亮、内联输入框、Enter/Escape 处理。

- [ ] **Step 1: 添加新的 props 和 emits**

修改 props 定义，添加：

```typescript
const props = defineProps<{
  doc: DocMeta
  depth: number
  shouldAutoExpand: boolean
  createMode: 'file' | 'folder' | null
}>()

const emit = defineEmits<{
  cancelCreate: []
}>()
```

新增 state：

```typescript
const newName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const isCreating = computed(() => {
  if (!props.createMode) return false
  return documentStore.selectedNodeId === props.doc.id
})
```

- [ ] **Step 2: 添加创建处理函数**

在 `handleClick` 之后添加：

```typescript
function isSelected(id: string) {
  return documentStore.selectedNodeId === id
}

function getCreateTargetPath(): string {
  // For the selected node, determine where to create
  if (props.doc.children) return props.doc.path // folder → create inside
  // file → create in parent dir
  const p = props.doc.path.replaceAll('\\', '/')
  const lastSep = p.lastIndexOf('/')
  return lastSep > 0 ? p.substring(0, lastSep) : p
}

async function handleCreate(e: KeyboardEvent) {
  const name = newName.value.trim()
  if (!name) return

  if (props.createMode === 'file') {
    await documentStore.doCreateFile(getCreateTargetPath(), name)
  } else if (props.createMode === 'folder') {
    await documentStore.doCreateFolder(getCreateTargetPath(), name)
  }
  await documentStore.doRefreshChildren(props.doc.id)
  emit('cancelCreate')
}
```

- [ ] **Step 3: 激活输入时自动聚焦**

使用 `watch` 监听 `isCreating`：

```typescript
watch(isCreating, async (val) => {
  if (val) {
    newName.value = props.createMode === 'file' ? '' : ''
    await nextTick()
    inputRef.value?.focus()
  }
})
```

需要新增 import: `import { computed, ref, watch, nextTick } from 'vue'`（部分已存在）。

- [ ] **Step 4: 修改模板 — 节点行添加选中样式**

在节点的 `<div>` 上添加：

```html
<div
  class="..."
  :class="{
    ...
    'bg-active text-title': isActive(doc.id),
    'ring-1 ring-primary/30': isSelected(doc.id) && !isActive(doc.id),
    ...
  }"
  @click="handleClick(doc)"
>
```

`handleClick` 需改为同时调用 `doSelectNode`：

```typescript
function handleClick(doc: DocMeta) {
  documentStore.doSelectNode(doc.id)
  if (doc.children) {
    documentStore.doToggleExpanded(doc.id)
  } else {
    documentStore.doOpenDoc(doc)
  }
}
```

- [ ] **Step 5: 在模板中选中节点的子列表末尾添加内联输入**

在 `</template>` 结束前（递归子节点之后），添加内联输入区域：

```html
<!-- 内联输入：在选中节点下创建 -->
<template v-if="isCreating">
  <div
    class="flex items-center gap-2 py-1"
    :style="{ paddingLeft: ((depth + 1) * 16 + 8) + 'px' }"
  >
    <div class="w-5 h-5 rounded-md border border-dashed border-primary/50 flex items-center justify-center shrink-0">
      <span class="text-[10px] text-primary/50">
        {{ createMode === 'file' ? 'F' : 'D' }}
      </span>
    </div>
    <input
      ref="inputRef"
      v-model="newName"
      type="text"
      class="flex-1 bg-transparent border-b border-primary text-sm text-text outline-none px-1"
      :placeholder="createMode === 'file' ? '文件名.md' : '文件夹名'"
      @keydown.enter="handleCreate($event)"
      @keydown.escape="emit('cancelCreate')"
      @blur="emit('cancelCreate')"
    />
  </div>
</template>
```

- [ ] **Step 6: 构建验证并提交**

```bash
npm run build
git add src/components/sidebar/DocTreeRecursive.vue
git commit -m "feat: add selection highlight and inline input to DocTreeRecursive"
```

---

### Task 5: Sidebar — 按钮组 + createMode 管理

**Files:**
- Modify: `src/components/layout/Sidebar.vue`

- [ ] **Step 1: 更新 script — 新增按钮状态和图标**

新增 import：
```typescript
import { FolderPlus, FilePlus, ChevronsUpDown, FileText, Search } from 'lucide-vue-next'
```

（保留 Star、FolderPlus 用于添加文档按钮）

新增 state：
```typescript
const createMode = ref<'file' | 'folder' | null>(null)

function handleCreateMode(mode: 'file' | 'folder') {
  if (!documentStore.selectedNodeId) return
  // 确保选中节点展开
  documentStore.expandedDirs.add(documentStore.selectedNodeId)
  documentStore.expandedDirs = new Set(documentStore.expandedDirs)
  createMode.value = mode
}

function handleCancelCreate() {
  createMode.value = null
}

function handleCollapseAll() {
  documentStore.doCollapseAll()
}
```

- [ ] **Step 2: 修改模板 — 项目行按钮组**

将「项目」行右侧的单个 `FolderPlus` 按钮替换为按钮组：

```html
<div class="flex items-center justify-between px-4 h-8 shrink-0 text-base font-semibold tracking-wider text-text/60">
  <span>项目</span>
  <div class="flex items-center gap-0.5">
    <button
      class="h-5 w-5 flex items-center justify-center rounded text-text/50 hover:bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      :disabled="!documentStore.selectedNodeId"
      @click="handleCreateMode('folder')"
      title="新建文件夹"
    >
      <FolderPlus class="w-3 h-3" />
    </button>
    <button
      class="h-5 w-5 flex items-center justify-center rounded text-text/50 hover:bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      :disabled="!documentStore.selectedNodeId"
      @click="handleCreateMode('file')"
      title="新建文件"
    >
      <FilePlus class="w-3 h-3" />
    </button>
    <button
      class="h-5 w-5 flex items-center justify-center rounded text-text/50 hover:bg-hover transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
      :disabled="documentStore.expandedDirs.size === 0"
      @click="handleCollapseAll"
      title="收起文件夹"
    >
      <ChevronsUpDown class="w-3 h-3" />
    </button>
  </div>
</div>
```

- [ ] **Step 3: 在 DocTree 上传递 createMode**

```html
<DocTree :create-mode="createMode" @cancel-create="handleCancelCreate" />
```

- [ ] **Step 4: 更新 DocTree.vue 透传 props 和事件**

`src/components/sidebar/DocTree.vue` 需要：
```typescript
defineProps<{ filter?: string; createMode: 'file' | 'folder' | null }>()
defineEmits<{ cancelCreate: [] }>()
```

并将 `createMode` 和 `@cancel-create` 透传给 `DocTreeRecursive`。

- [ ] **Step 5: 构建验证并提交**

```bash
npm run build
git add src/components/layout/Sidebar.vue src/components/sidebar/DocTree.vue
git commit -m "feat: add create file/folder/collapse buttons to Sidebar"
```

---

## 验证清单

- [ ] `npm run build` 构建通过
- [ ] `npm run tauri dev` 启动后：
  1. 点击文件夹树中某节点 → 节点被选中（ring 高亮）
  2. 未选中时 → 新建文件/文件夹按钮 disabled
  3. 选中文件夹后点击「新建文件」→ 内联输入出现在该文件夹子列表底部
  4. 输入 `test.md` 按 Enter → 文件创建成功，树刷新显示新文件
  5. 按 Escape → 输入框消失，不创建
  6. 新建文件夹同理
  7. 点击「收起」→ 所有展开的文件夹折叠
  8. 所有展开 →「收起」按钮 disabled
