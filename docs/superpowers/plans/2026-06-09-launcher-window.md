# 小窗模式 (Launcher Window) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击最小化按钮时隐藏主窗口并弹出一个独立的 Tauri 浮动小窗（类似 Spotlight），提供搜索框 + 最近文档列表。

**Architecture:** 在 `tauri.conf.json` 中静态定义两个窗口（`main` + `launcher`），加载同一个 `index.html`。`App.vue` 根据 `window.label` 条件渲染 `MainLayout` 或 `LauncherPage`。窗口间通过 Tauri events 通信，文档数据通过 localStorage 共享。

**Tech Stack:** Vue 3 + TypeScript + Pinia 3 + Tauri v2 + Tailwind CSS 4 + Lucide Vue Next

---

## 文件结构总览

| 操作 | 文件 | 职责 |
|---|---|---|
| 新建 | `src/pages/LauncherPage.vue` | 小窗页面：搜索框 + 最近文档列表 + 底部栏 |
| 新建 | `src/stores/windowStore.ts` | 窗口通信状态：控制小窗显示/隐藏、事件监听 |
| 新建 | `src/composables/useLauncher.ts` | 小窗逻辑 composable：窗口定位、事件收发 |
| 修改 | `src-tauri/tauri.conf.json` | 添加 `launcher` 窗口定义 |
| 修改 | `src-tauri/capabilities/default.json` | 扩展 launcher 窗口权限 + 事件权限 |
| 修改 | `src/App.vue` | 根据 `window.label` 条件渲染不同页面 |
| 修改 | `src/components/layout/AppHeader.vue` | 最小化按钮触发小窗而非窗口最小化 |

---

### Task 1: Tauri 窗口配置 — 添加 launcher 窗口

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: 在 `tauri.conf.json` 中添加 launcher 窗口定义**

在 `app.windows` 数组中新增第二个窗口对象：

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/config.schema.json",
  "productName": "DocViewer",
  "version": "0.1.0",
  "identifier": "com.docviewer.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "DocViewer",
        "width": 1400,
        "height": 900,
        "minWidth": 900,
        "minHeight": 500,
        "center": true,
        "resizable": true,
        "fullscreen": false,
        "decorations": false
      },
      {
        "label": "launcher",
        "title": "DocViewer",
        "width": 480,
        "height": 460,
        "minWidth": 400,
        "minHeight": 300,
        "center": false,
        "resizable": false,
        "fullscreen": false,
        "decorations": false,
        "visible": false,
        "skipTaskbar": true,
        "alwaysOnTop": true,
        "focus": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "android": {
      "debugApplicationIdSuffix": ".debug"
    }
  }
}
```

- [ ] **Step 2: 更新 `capabilities/default.json` — 添加 launcher 窗口和事件权限**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for main and launcher windows",
  "windows": ["main", "launcher"],
  "permissions": [
    "core:default",
    "core:path:default",
    "core:window:allow-minimize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-close",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-focus",
    "core:window:allow-set-position",
    "core:window:allow-set-size",
    "core:window:allow-set-resizable",
    "core:window:allow-set-skip-taskbar",
    "core:window:allow-set-always-on-top",
    "core:event:allow-emit",
    "core:event:allow-listen",
    "fs:allow-read",
    "fs:allow-read-text-file",
    "fs:allow-read-dir",
    "fs:allow-exists",
    "dialog:allow-open"
  ]
}
```

- [ ] **Step 3: 类型检查 + 提交**

```bash
npm run build
git add src-tauri/tauri.conf.json src-tauri/capabilities/default.json
git commit -m "feat: add launcher window config and permissions"
```

---

### Task 2: 创建 windowStore — 窗口通信状态管理

**Files:**
- Create: `src/stores/windowStore.ts`

- [ ] **Step 1: 创建 `src/stores/windowStore.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentWindow, WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event'

export const useWindowStore = defineStore('window', () => {
  const isLauncherVisible = ref(false)
  const currentLabel = ref<string>('main')

  let unlistenOpenDoc: UnlistenFn | null = null
  let unlistenShow: UnlistenFn | null = null
  let unlistenClose: UnlistenFn | null = null

  /** 检测当前窗口 label 并初始化 */
  async function doInit() {
    currentLabel.value = getCurrentWindow().label
  }

  /** 主窗口: 最小化 → 弹出小窗 */
  async function doShowLauncher() {
    if (currentLabel.value !== 'main') return

    const launcher = WebviewWindow.getByLabel('launcher')
    if (!launcher) {
      console.error('Launcher window not found')
      return
    }

    // 检查小窗是否已显示（幂等）
    if (isLauncherVisible.value) return

    // 隐藏主窗口
    const main = getCurrentWindow()
    await main.hide()

    // 定位小窗到屏幕顶部居中
    const y = Math.round(window.screen.height * 0.15)
    const x = Math.round((window.screen.width - 480) / 2)
    await launcher.setPosition({ x, y })
    await launcher.setSize({ width: 480, height: 460 })
    await launcher.show()
    await launcher.setFocus()

    isLauncherVisible.value = true
  }

  /** 主窗口: 恢复 → 关闭小窗 */
  async function doHideLauncher() {
    if (currentLabel.value !== 'main') return

    const launcher = WebviewWindow.getByLabel('launcher')
    if (!launcher) return

    await launcher.hide()
    isLauncherVisible.value = false
  }

  /** 主窗口: 打开指定文档并恢复 */
  async function doOpenDocFromLauncher(docId: string) {
    if (currentLabel.value !== 'main') return

    const { useDocumentStore } = await import('@/stores/documentStore')
    const docStore = useDocumentStore()

    const doc = findDocById(docId, docStore.docTree)
    if (doc) {
      docStore.doOpenDoc(doc)
    }

    // 恢复主窗口
    const main = getCurrentWindow()
    await main.show()
    await main.setFocus()

    // 隐藏小窗
    await doHideLauncher()
  }

  function findDocById(id: string, docs: import('@/types/document').DocMeta[]): import('@/types/document').DocMeta | null {
    for (const doc of docs) {
      if (doc.id === id) return doc
      if (doc.children) {
        const found = findDocById(id, doc.children)
        if (found) return found
      }
    }
    return null
  }

  /** 主窗口 + 小窗: 启动事件监听 */
  async function doStartListeners() {
    if (currentLabel.value === 'main') {
      // 主窗口: 监听小窗发来的打开文档请求
      unlistenOpenDoc = await listen<{ docId: string }>('launcher:open-doc', (event) => {
        doOpenDocFromLauncher(event.payload.docId)
      })
    }

    if (currentLabel.value === 'launcher') {
      // 小窗: 监听主窗口发来的显示/关闭指令
      unlistenShow = await listen('launcher:show', async () => {
        isLauncherVisible.value = true
      })
      unlistenClose = await listen('launcher:close', async () => {
        const launcher = getCurrentWindow()
        await launcher.hide()
        isLauncherVisible.value = false
      })
    }
  }

  /** 小窗: 通知主窗口打开文档 */
  async function doNotifyOpenDoc(docId: string) {
    if (currentLabel.value !== 'launcher') return
    await emit('launcher:open-doc', { docId })
  }

  /** 主窗口: 关闭小窗（不恢复主窗口） */
  async function doCloseLauncherOnly() {
    if (currentLabel.value !== 'launcher') return
    const launcher = getCurrentWindow()
    await launcher.hide()
    isLauncherVisible.value = false
  }

  /** 清理监听器 */
  function doCleanup() {
    unlistenOpenDoc?.()
    unlistenShow?.()
    unlistenClose?.()
  }

  return {
    isLauncherVisible, currentLabel,
    doInit, doShowLauncher, doHideLauncher, doOpenDocFromLauncher,
    doStartListeners, doNotifyOpenDoc, doCloseLauncherOnly, doCleanup,
  }
})
```

- [ ] **Step 2: 类型检查 + 提交**

```bash
npm run build
git add src/stores/windowStore.ts
git commit -m "feat: add windowStore for launcher window management"
```

---

### Task 3: 创建 useLauncher composable

**Files:**
- Create: `src/composables/useLauncher.ts`

- [ ] **Step 1: 创建 `src/composables/useLauncher.ts`**

```typescript
import { onMounted, onUnmounted } from 'vue'
import { useWindowStore } from '@/stores/windowStore'

/**
 * 小窗模式逻辑 composable
 * - 主窗口: 初始化监听器，监听 launcher:open-doc 事件
 * - 小窗: 初始化监听器，监听 launcher:show / launcher:close 事件
 * 挂载时自动调用 doInit + doStartListeners，卸载时 doCleanup
 */
export function useLauncher() {
  const windowStore = useWindowStore()

  onMounted(async () => {
    await windowStore.doInit()

    // 小窗：启动时立即设置尺寸和位置
    if (windowStore.currentLabel === 'launcher') {
      const { getCurrentWindow } = await import('@tauri-apps/api/webviewWindow')
      const launcher = getCurrentWindow()
      const y = Math.round(window.screen.height * 0.15)
      const x = Math.round((window.screen.width - 480) / 2)
      await launcher.setPosition({ x, y })
      await launcher.setSize({ width: 480, height: 460 })
    }

    await windowStore.doStartListeners()
  })

  onUnmounted(() => {
    windowStore.doCleanup()
  })

  return {
    showLauncher: windowStore.doShowLauncher,
    hideLauncher: windowStore.doHideLauncher,
    notifyOpenDoc: windowStore.doNotifyOpenDoc,
    closeLauncherOnly: windowStore.doCloseLauncherOnly,
    currentLabel: windowStore.currentLabel,
  }
}
```

- [ ] **Step 2: 类型检查 + 提交**

```bash
npm run build
git add src/composables/useLauncher.ts
git commit -m "feat: add useLauncher composable"
```

---

### Task 4: 创建 LauncherPage 组件

**Files:**
- Create: `src/pages/LauncherPage.vue`

- [ ] **Step 1: 创建 `src/pages/LauncherPage.vue` — 脚本部分**

```vue
<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { useWindowStore } from '@/stores/windowStore'
import { useLauncher } from '@/composables/useLauncher'
import { Search, X, Clock, Keyboard } from 'lucide-vue-next'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()
const windowStore = useWindowStore()
const { notifyOpenDoc, closeLauncherOnly } = useLauncher()

const inputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')

// 在 launcher 窗口内，对最近文档进行本地过滤
const filteredDocs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const source = documentStore.openedDocs

  if (!q) return source.slice(0, 6)

  // 本地名称过滤（小窗不需要全文搜索索引，保持轻量）
  return source.filter(d =>
    d.name.toLowerCase().includes(q) ||
    documentStore.getFolderTag(d.id).toLowerCase().includes(q)
  ).slice(0, 6)
})

// 文件类型徽章
interface FileTypeBadge { letter: string; bgColor: string }
function getFileTypeBadge(_type: string, name: string): FileTypeBadge {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'md': case 'markdown': return { letter: 'M↓', bgColor: 'bg-blue-500' }
    case 'json': return { letter: 'J', bgColor: 'bg-yellow-500' }
    case 'pdf': return { letter: 'PDF', bgColor: 'bg-red-500' }
    case 'yaml': case 'yml': return { letter: 'Y', bgColor: 'bg-orange-500' }
    case 'toml': return { letter: 'T', bgColor: 'bg-purple-500' }
    case 'xml': return { letter: 'X', bgColor: 'bg-teal-500' }
    case 'csv': return { letter: 'C', bgColor: 'bg-green-600' }
    default: return { letter: ext.slice(0, 3).toUpperCase(), bgColor: 'bg-green-500' }
  }
}

function formatDate(ts: number | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function handleClick(doc: typeof documentStore.openedDocs[number]) {
  searchStore.doAddToHistory(searchQuery.value)
  notifyOpenDoc(doc.id)
}

function handleClose() {
  closeLauncherOnly()
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleClose()
  }
}

function handleOverlayClick(event: MouseEvent) {
  if ((event.target as HTMLElement).dataset.overlay === 'true') {
    handleClose()
  }
}

function handleSearch() {
  // 搜索已经通过 watch searchQuery + computed 实时过滤
  // 点击按钮时聚焦输入框
  inputRef.value?.focus()
}

onMounted(async () => {
  await nextTick()
  inputRef.value?.focus()
})
</script>
```

- [ ] **Step 2: 创建 LauncherPage 模板部分**

```vue
<template>
  <div
    class="h-screen w-screen flex flex-col bg-surface border border-border rounded-xl overflow-hidden shadow-2xl"
    data-overlay="true"
    @click="handleOverlayClick"
    @keydown="handleKeyDown"
  >
    <!-- 标题栏 -->
    <header
      class="flex items-center justify-between h-10 px-4 shrink-0 select-none"
      data-tauri-drag-region
    >
      <div class="flex items-center gap-2">
        <div class="w-5 h-5 rounded flex items-center justify-center bg-primary">
          <span class="text-white text-xs font-bold">D</span>
        </div>
        <span class="text-sm font-semibold text-title">DocViewer</span>
      </div>
      <button
        class="h-6 w-6 flex items-center justify-center rounded text-text/50 hover:text-text hover:bg-hover transition-colors"
        data-tauri-drag-region="false"
        @click="handleClose"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </header>

    <!-- 搜索区 -->
    <div class="px-4 py-2.5 shrink-0">
      <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-bg border border-border">
        <Search class="w-4 h-4 text-text/40 shrink-0" />
        <input
          ref="inputRef"
          v-model="searchQuery"
          type="text"
          class="flex-1 bg-transparent border-none outline-none text-sm text-text placeholder:text-text/40"
          placeholder="搜索文档 (Ctrl+K)"
        />
        <button
          class="shrink-0 px-3 py-1 rounded bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
          @click="handleSearch"
        >
          搜索
        </button>
      </div>
    </div>

    <!-- 最近文档列表 -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <div class="flex items-center justify-between px-4 h-7 shrink-0">
        <span class="text-xs text-text/50">
          {{ searchQuery ? '搜索结果' : '最近文档' }}
        </span>
      </div>

      <div class="flex-1 overflow-y-auto px-2">
        <!-- 空状态 -->
        <div
          v-if="filteredDocs.length === 0"
          class="flex items-center justify-center py-10"
        >
          <span class="text-sm text-text/30">
            {{ documentStore.openedDocs.length === 0 ? '从主窗口打开文档' : '未找到匹配的文档' }}
          </span>
        </div>

        <!-- 文档条目 -->
        <div
          v-for="doc in filteredDocs"
          :key="doc.id"
          class="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-colors hover:bg-hover"
          @click="handleClick(doc)"
        >
          <!-- 文件类型徽章 -->
          <div
            class="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
            :class="getFileTypeBadge(doc.type, doc.name).bgColor"
          >
            {{ getFileTypeBadge(doc.type, doc.name).letter }}
          </div>

          <!-- 信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium truncate text-title">{{ doc.name }}</span>
              <span class="text-xs text-text/40 shrink-0">{{ formatSize(doc.size) }}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-text/40">
              <span>{{ documentStore.getFolderTag(doc.id) }}</span>
              <span v-if="doc.lastOpen">{{ formatDate(doc.lastOpen) }}</span>
            </div>
          </div>

          <!-- 收藏图标 -->
          <span
            v-if="doc.favorite"
            class="text-amber-400 text-xs shrink-0"
            title="已收藏"
          >★</span>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="flex items-center justify-between px-4 h-9 shrink-0 border-t border-border">
      <div class="flex items-center gap-1">
        <button
          class="flex items-center gap-1 px-2 py-1 rounded text-xs text-text/50 hover:text-text hover:bg-hover transition-colors"
        >
          <Clock class="w-3 h-3" />
          <span>最近文档</span>
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="flex items-center gap-1 px-2 py-1 rounded text-xs text-text/50 hover:text-text hover:bg-hover transition-colors"
        >
          <Keyboard class="w-3 h-3" />
          <span>快捷键</span>
        </button>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 3: 类型检查 + 提交**

```bash
npm run build
git add src/pages/LauncherPage.vue
git commit -m "feat: add LauncherPage component"
```

---

### Task 5: 更新 App.vue — 双窗口条件渲染

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 修改 `src/App.vue` 支持条件渲染**

将整个文件替换为：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useKeyboard } from '@/composables/useKeyboard'
import { useLauncher } from '@/composables/useLauncher'
import { useWindowStore } from '@/stores/windowStore'
import MainLayout from '@/layouts/MainLayout.vue'
import SearchOverlay from '@/components/search/SearchOverlay.vue'
import ContentViewer from '@/components/viewer/ContentViewer.vue'
import LauncherPage from '@/pages/LauncherPage.vue'

useKeyboard()

const { currentLabel } = useLauncher()
const ready = ref(false)

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <!-- 小窗模式 -->
  <LauncherPage v-if="ready && currentLabel === 'launcher'" />

  <!-- 主窗口模式 -->
  <template v-else-if="ready">
    <MainLayout>
      <ContentViewer />
    </MainLayout>
    <SearchOverlay />
  </template>

  <!-- 加载中占位 -->
  <div v-else class="h-screen w-screen bg-bg" />
</template>
```

> **注意**: 需要先挂载才能正确读取 `currentLabel`，否则会短暂闪烁。`ready` 标志确保 `onMounted` 中 `windowStore.doInit()` 执行完毕后再渲染。

- [ ] **Step 2: 类型检查 + 构建验证**

```bash
npm run build
```

- [ ] **Step 3: 提交**

```bash
git add src/App.vue
git commit -m "feat: conditional render for main/launcher windows"
```

---

### Task 6: 修改 AppHeader — 最小化按钮触发小窗

**Files:**
- Modify: `src/components/layout/AppHeader.vue:76-84`

- [ ] **Step 1: 修改最小化按钮行为**

在 script 中添加 `useWindowStore` 导入，替换原有的 `handleMinimize` 调用：

修改 `<script setup>` 部分，添加：

```typescript
import { useWindowStore } from '@/stores/windowStore'

// 在 searchStore/settingStore/documentStore 定义之后添加:
const windowStore = useWindowStore()
```

然后修改模板部分的最小化按钮（L80），将 `@click="appWindow.minimize()"` 替换为 `@click="windowStore.doShowLauncher()"`：

```vue
<Button
  variant="ghost"
  size="icon"
  class="text-text hover:bg-hover"
  @click="windowStore.doShowLauncher()"
  title="最小化"
>
  <Minus class="w-4 h-4" />
</Button>
```

由于不再需要直接操作 appWindow 做 minimize，`getCurrentWindow` 导入可以保留（toggleMaximize 和 close 仍然需要）。

- [ ] **Step 2: 类型检查 + 构建验证**

```bash
npm run build
```

- [ ] **Step 3: 最终提交**

```bash
git add src/components/layout/AppHeader.vue
git commit -m "feat: minimize button triggers launcher window"
```

---

## 验证清单

全部任务完成后，运行以下验证：

- [ ] `npm run build` 构建通过
- [ ] `npm run tauri dev` 启动后：
  1. 点击最小化按钮 → 主窗口隐藏，小窗在屏幕顶部居中弹出
  2. 小窗显示最近打开的文档列表
  3. 在小窗搜索框输入 → 实时过滤文档
  4. 点击文档 → 小窗关闭，主窗口恢复并加载对应文档
  5. 按 Esc / 点击 X → 小窗关闭，主窗口保持隐藏
  6. 从任务栏恢复主窗口 → 主窗口正常显示
  7. 无最近文档时 → 小窗显示空状态提示
  8. 小窗有 `data-tauri-drag-region` 属性 → 可拖拽移动
