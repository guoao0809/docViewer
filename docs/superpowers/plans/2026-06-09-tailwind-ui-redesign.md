# DocViewer Tailwind UI 改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 Tailwind CSS v4 对 DocViewer 进行全面 UI 重构，参照设计图实现浅色 + 深色双主题，替换现有 inline style + CSS 变量混用方式为 Tailwind 工具类 + 语义化颜色 token 体系。

**Architecture:** 采用方案 B（全面重构 + Tailwind），保留 CSS 变量用于主题切换，通过 `@theme` 块将 CSS 变量映射为 Tailwind 语义化颜色类（`bg-bg`、`text-title` 等）。所有组件移除 JS hover 逻辑，改用 Tailwind `hover:` 类。充分利用已有 reka-ui 基础组件（Button、Badge、Separator 等）。

**Tech Stack:** Vue 3 + TypeScript, Tailwind CSS v4 (@tailwindcss/vite), Pinia, reka-ui, class-variance-authority, tailwind-merge, Tauri v2

---

## 前置任务：UI 组件变体适配

在开始主改造前，需要更新现有 UI 组件的 CVA 变体以匹配新配色体系。

### Task 1: 更新 Button 组件变体

**Files:**
- Modify: `src/components/ui/button/index.ts`

- [ ] **Step 1: 更新 buttonVariants 以使用新语义化颜色**

当前 `buttonVariants` 使用 `bg-primary text-primary-foreground` 等类，这些是 Tailwind 默认色板。改造后我们的 `@theme` 会定义 `--color-primary` 等自定义变量，Tailwind 会自动生成对应的工具类。但 `text-primary-foreground` 需要改为直接使用白色或我们定义的标题色。

```typescript
// src/components/ui/button/index.ts
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // default: 蓝色背景 + 白色文字
        default: "bg-primary text-white hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-border bg-bg hover:bg-hover",
        secondary:
          "bg-panel text-text hover:bg-panel/80",
        ghost: "hover:bg-hover",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        "default": "h-10 px-4 py-2",
        "sm": "h-9 rounded-md px-3",
        "lg": "h-11 rounded-md px-8",
        "icon": "h-10 w-10",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
```

- [ ] **Step 2: 验证编译**

Run: `npm run dev`
Expected: Vite 启动成功，无 TypeScript 错误

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button/index.ts
git commit -m "refactor: update button variants for new theme system"
```

### Task 2: 更新 Badge 组件变体

**Files:**
- Modify: `src/components/ui/badge/index.ts`

- [ ] **Step 1: 更新 badgeVariants**

```typescript
// src/components/ui/badge/index.ts
export const badgeVariants = cva(
  "inline-flex gap-1 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-white hover:bg-primary/80",
        secondary:
          "border-transparent bg-panel text-text hover:bg-panel/80",
        destructive:
          "border-transparent bg-red-500 text-white hover:bg-red-500/80",
        outline: "border-border text-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/badge/index.ts
git commit -m "refactor: update badge variants for new theme system"
```

### Task 3: 确认其他 UI 组件兼容性

检查 ScrollArea、Separator、Tooltip、Dialog 等组件，确保它们使用的颜色类与新 `@theme` 兼容。如有不兼容，更新其变体定义。

**Files:**
- Read: `src/components/ui/scroll-area/index.ts`
- Read: `src/components/ui/separator/index.ts`
- Read: `src/components/ui/tooltip/index.ts`

- [ ] **Step 1: 读取并检查各组件**

逐一读取上述文件，搜索其中使用的 Tailwind 颜色类（如 `bg-background`、`border-input` 等），记录需要更新的类名。

- [ ] **Step 2: 按需更新不兼容的变体**

如果发现任何使用旧色板名称的变体，更新为新语义化名称或使用内联 CSS 变量引用。

- [ ] **Step 3: Commit（如有修改）**

```bash
git add src/components/ui/*/index.ts
git commit -m "refactor: ensure UI component compatibility with new theme"
```

---

## 核心改造任务

### Task 4: 全局样式重构 — style.css

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: 重写 style.css**

```css
/* src/style.css */
@import "tailwindcss";

/* 语义化颜色 token — 供组件使用 bg-bg, text-title 等类 */
@theme {
  --color-bg: var(--bg);
  --color-surface: var(--sidebar);
  --color-panel: var(--panel);
  --color-text: var(--text);
  --color-title: var(--title);
  --color-primary: var(--primary);
  --color-border: var(--border);
  --color-hover: var(--hover-bg);
  --color-active: var(--active-bg);
}

/* ===== 主题变量定义 ===== */

:root[data-theme="dark"] {
  --bg: #0f1117;
  --sidebar: #161822;
  --panel: #1e2030;
  --text: #8b8fa3;
  --title: #e2e4ed;
  --primary: #3b82f6;
  --border: #2a2d3e;
  --hover-bg: #1e2030;
  --active-bg: #1e2a4a;
  --scrollbar-thumb: #2a2d3e;
  --scrollbar-track: transparent;
}

:root[data-theme="light"] {
  --bg: #ffffff;
  --sidebar: #f5f6f8;
  --panel: #f0f1f3;
  --text: #4b5563;
  --title: #111827;
  --primary: #3b82f6;
  --border: #e5e7eb;
  --hover-bg: #f0f1f3;
  --active-bg: #eff6ff;
  --scrollbar-thumb: #d1d5db;
  --scrollbar-track: transparent;
}

/* ===== 基础重置与布局 ===== */

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 13px;
  line-height: 1.5;
}

/* ===== 滚动条样式 ===== */

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--scrollbar-track); }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: #555; }

/* ===== Markdown 内容样式 ===== */
/* 动态 HTML 渲染，必须保留 CSS 类方式 */

.markdown-content {
  padding: 2rem;
  max-width: 860px;
  margin: 0 auto;
  color: var(--text);
}

.markdown-content h1 {
  font-size: 2em;
  font-weight: 600;
  margin: 0.67em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
  color: var(--title);
}

.markdown-content h2 {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0.83em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
  color: var(--title);
}

.markdown-content h3 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0;
  color: var(--title);
}

.markdown-content h4, .markdown-content h5, .markdown-content h6 {
  font-size: 1em;
  font-weight: 600;
  margin: 1em 0;
  color: var(--title);
}

.markdown-content p {
  margin: 0.5em 0;
  line-height: 1.7;
}

.markdown-content ul, .markdown-content ol {
  padding-left: 2em;
  margin: 0.5em 0;
}

.markdown-content li {
  margin: 0.25em 0;
}

.markdown-content code {
  background-color: var(--panel);
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;
  font-size: 0.9em;
  color: var(--primary);
}

.markdown-content pre {
  background-color: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content pre code {
  background: none;
  padding: 0;
  color: var(--text);
}

.markdown-content blockquote {
  border-left: 4px solid var(--primary);
  padding: 0.5em 1em;
  margin: 1em 0;
  background-color: var(--panel);
  border-radius: 0 4px 4px 0;
}

.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-content th, .markdown-content td {
  border: 1px solid var(--border);
  padding: 0.5em 0.75em;
  text-align: left;
}

.markdown-content th {
  background-color: var(--panel);
  font-weight: 600;
  color: var(--title);
}

.markdown-content a {
  color: var(--primary);
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

.markdown-content img {
  max-width: 100%;
  border-radius: 4px;
}

.markdown-content hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.5em 0;
}

.markdown-content .header-anchor {
  opacity: 0;
  margin-left: 0.5em;
  color: var(--primary);
  font-size: 0.8em;
  text-decoration: none;
  transition: opacity 0.15s;
}

.markdown-content h1:hover .header-anchor,
.markdown-content h2:hover .header-anchor,
.markdown-content h3:hover .header-anchor,
.markdown-content h4:hover .header-anchor,
.markdown-content h5:hover .header-anchor,
.markdown-content h6:hover .header-anchor {
  opacity: 1;
}
```

- [ ] **Step 2: 验证编译**

Run: `npm run dev`
Expected: Vite 启动成功，无 CSS 解析错误

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "style: rewrite style.css with @theme tokens and updated color palette"
```

---

### Task 5: AppHeader.vue — 搜索栏居中 + Tailwind 重构

**Files:**
- Modify: `src/components/layout/AppHeader.vue`

**关键变化：**
- 搜索栏从左侧移至中央，宽度更大
- 新增主题切换图标（Sun/Moon）和菜单图标
- 移除所有 JS hover 逻辑
- 使用 Button 组件替代原生 `<button>`

- [ ] **Step 1: 重写 AppHeader.vue template**

```vue
<!-- src/components/layout/AppHeader.vue -->
<script setup lang="ts">
import { useSearchStore } from '@/stores/searchStore'
import { useSettingStore } from '@/stores/settingStore'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Search, FolderOpen, Sun, Moon, Minus, Square, X, Menu } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const searchStore = useSearchStore()
const settingStore = useSettingStore()
const documentStore = useDocumentStore()
const appWindow = getCurrentWindow()

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleSearchClick() { searchStore.doOpenSearch() }
function handleToggleTheme() { settingStore.doToggleTheme() }
</script>

<template>
  <header
    class="flex items-center justify-between h-12 px-4 select-none shrink-0 bg-surface border-b border-border"
    data-tauri-drag-region
  >
    <!-- 左侧: Logo + 名称 -->
    <div class="flex items-center gap-3 shrink-0">
      <div
        class="w-7 h-7 rounded-md flex items-center justify-center bg-primary"
      >
        <span class="text-white text-sm font-bold">D</span>
      </div>
      <span class="text-sm font-semibold tracking-wide text-title">DocViewer</span>
    </div>

    <!-- 中间: 搜索入口 -->
    <div class="flex-1 max-w-2xl mx-6 cursor-pointer" @click="handleSearchClick">
      <div
        class="flex items-center gap-2 h-9 px-4 rounded-lg text-sm bg-bg border border-border text-text"
      >
        <Search class="w-4 h-4 shrink-0 opacity-50" />
        <span class="opacity-50">搜索文档...</span>
        <kbd
          class="ml-auto text-xs px-2 py-0.5 rounded bg-panel border border-border opacity-40 font-mono"
        >Ctrl+K</kbd>
      </div>
    </div>

    <!-- 右侧: 操作按钮 -->
    <div class="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        class="text-text hover:bg-hover"
        @click="handleOpenFolder"
        title="打开文件夹"
      >
        <FolderOpen class="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        class="text-text hover:bg-hover"
        @click="handleToggleTheme"
        :title="settingStore.theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
      >
        <Sun v-if="settingStore.theme === 'dark'" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </Button>

      <!-- Window controls -->
      <div class="flex items-center ml-1" data-tauri-drag-region="false">
        <Button
          variant="ghost"
          size="icon"
          class="text-text hover:bg-hover"
          @click="appWindow.minimize()"
          title="最小化"
        >
          <Minus class="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-text hover:bg-hover"
          @click="appWindow.toggleMaximize()"
          title="最大化"
        >
          <Square class="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="text-text hover:bg-red-500/80"
          @click="appWindow.close()"
          title="关闭"
        >
          <X class="w-4 h-4" />
        </Button>
      </div>
    </div>
  </header>
</template>
```

- [ ] **Step 2: 验证编译**

Run: `npm run dev`
Expected: Vite HMR 热更新成功，无 TypeScript 错误

- [ ] **Step 3: 手动测试**

1. 打开应用，检查 Header 布局：Logo 在左，搜索框居中，按钮在右
2. 点击搜索框 → SearchOverlay 应打开
3. 点击主题切换按钮 → 主题应在深色/浅色间切换
4. 悬停各按钮 → 应有 hover 背景色

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppHeader.vue
git commit -m "refactor: center search bar, use Tailwind classes, remove JS hover in AppHeader"
```

---

### Task 6: Sidebar.vue — 导航+文件夹树整合

**Files:**
- Modify: `src/components/layout/Sidebar.vue`

**关键变化：**
- 导航项 + 文件夹树整合在同一区域
- 最近打开/收藏夹保留为占位导航项
- 移除 JS hover 逻辑
- 设置项固定在底部

- [ ] **Step 1: 重写 Sidebar.vue**

```vue
<!-- src/components/layout/Sidebar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import DocTree from '@/components/sidebar/DocTree.vue'
import { useDocumentStore } from '@/stores/documentStore'
import { useSearchStore } from '@/stores/searchStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderPlus, Clock, Star, FileText, Search, Settings } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const documentStore = useDocumentStore()
const searchStore = useSearchStore()

const navItems = [
  { key: 'recent',   icon: Clock,     label: '最近打开' },
  { key: 'favorites',icon: Star,      label: '收藏夹' },
  { key: 'all',      icon: FileText,  label: '全部文档' },
  { key: 'history',  icon: Search,    label: '搜索历史' },
]

const activeNav = computed(() => 'all')

async function handleAddFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleNavClick(_key: string) {
  // Future: filter document list by category
}

function handleSearchHistory() {
  searchStore.doOpenSearch()
}
</script>

<template>
  <aside class="flex flex-col overflow-hidden select-none bg-surface">
    <!-- Add document button -->
    <div class="px-3 py-3 shrink-0">
      <Button
        class="w-full bg-primary text-white hover:bg-primary/90 font-medium"
        @click="handleAddFolder"
      >
        <FolderPlus class="w-4 h-4" />
        添加文档
      </Button>
    </div>

    <!-- Navigation menu -->
    <div class="px-2 shrink-0 space-y-0.5">
      <div
        v-for="item in navItems"
        :key="item.key"
        class="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors"
        :class="{
          'bg-active text-title font-medium': activeNav === item.key,
          'text-text hover:bg-hover': activeNav !== item.key,
        }"
        @click="item.key === 'history' ? handleSearchHistory() : handleNavClick(item.key)"
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0 opacity-60" />
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- Divider -->
    <div class="mx-3 my-2 border-t border-border" />

    <!-- Project folders section -->
    <div class="flex items-center justify-between px-4 h-7 shrink-0 text-xs font-semibold uppercase tracking-wider text-text/60">
      <span>项目</span>
      <Button variant="ghost" size="icon-sm" class="h-5 w-5 text-text/60 hover:bg-hover" @click="handleAddFolder" title="添加文件夹">
        <FolderPlus class="w-3 h-3" />
      </Button>
    </div>

    <!-- Folder tree -->
    <div class="flex-1 overflow-y-auto px-2">
      <DocTree />
    </div>

    <!-- Settings at bottom -->
    <div class="border-t border-border mt-auto">
      <div
        class="flex items-center gap-2 px-4 py-2 cursor-pointer text-sm text-text/60 hover:bg-hover transition-colors"
        @click="$emit('open-settings')"
      >
        <Settings class="w-4 h-4 shrink-0" />
        <span>设置</span>
      </div>
    </div>
  </aside>
</template>
```

- [ ] **Step 2: 验证编译**

Run: `npm run dev`
Expected: Vite HMR 热更新成功

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.vue
git commit -m "refactor: integrate nav + folder tree, use Tailwind, remove JS hover in Sidebar"
```

---

### Task 7: DocumentList.vue — 彩色文件徽章 + Tailwind

**Files:**
- Modify: `src/components/layout/DocumentList.vue`

**关键变化：**
- 文件图标改为彩色字母徽章（M↓=蓝、J=黄、PDF=红、SK=灰）
- 列表项样式统一
- 移除 JS hover

- [ ] **Step 1: 添加文件类型徽章工具函数**

在组件中添加根据文件扩展名返回徽章样式的函数：

```typescript
// 在 DocumentList.vue 的 <script setup> 中添加

interface FileTypeBadge {
  letter: string
  bgColor: string  // Tailwind bg class like 'bg-blue-500'
}

function getFileTypeBadge(type: string, name: string): FileTypeBadge {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  
  switch (ext) {
    case 'md':
    case 'markdown':
      return { letter: 'M↓', bgColor: 'bg-blue-500' }
    case 'json':
      return { letter: 'J', bgColor: 'bg-yellow-500' }
    case 'pdf':
      return { letter: 'PDF', bgColor: 'bg-red-500' }
    case 'sketch':
      return { letter: 'SK', bgColor: 'bg-gray-400' }
    default:
      return { letter: ext.slice(0, 3).toUpperCase(), bgColor: 'bg-green-500' }
  }
}
```

- [ ] **Step 2: 重写 template**

```vue
<!-- src/components/layout/DocumentList.vue -->
<template>
  <aside
    class="flex flex-col overflow-hidden border-r border-border bg-surface"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between px-4 h-10 shrink-0 border-b border-border"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-title">全部文档</span>
        <span class="text-xs rounded-full px-1.5 py-0.5 bg-panel text-text/60">
          共 {{ documentStore.openedDocs.length }} 个文档
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="documentStore.openedDocs.length === 0"
      class="flex-1 flex items-center justify-center p-4"
    >
      <span class="text-xs text-text/30">
        从左侧文件夹选择文档
      </span>
    </div>

    <!-- Document list -->
    <div v-else class="flex-1 overflow-y-auto">
      <div
        v-for="doc in documentStore.openedDocs"
        :key="doc.id"
        class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border group transition-colors"
        :class="{
          'bg-active': doc.id === documentStore.activeDocId,
          'hover:bg-hover': doc.id !== documentStore.activeDocId,
        }"
        @click="handleClick(doc)"
      >
        <!-- File type badge -->
        <div
          class="w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white shrink-0"
          :class="getFileTypeBadge(doc.type, doc.name).bgColor"
        >
          {{ getFileTypeBadge(doc.type, doc.name).letter }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate text-title">{{ doc.name }}</div>
          <div class="flex items-center gap-2 text-xs text-text/50">
            <span v-if="doc.lastOpen">{{ formatDate(doc.lastOpen) }}</span>
            <span>{{ formatSize(doc.size) }}</span>
            <span class="px-1.5 py-0.5 rounded text-xs bg-panel">
              {{ documentStore.getFolderTag(doc.id) }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded transition-colors"
          :class="doc.favorite ? 'text-amber-400' : 'text-text/20 opacity-0 group-hover:opacity-100'"
          @click="handleToggleStar($event, doc.id)"
          title="收藏"
        >
          <Star class="w-4 h-4" :class="doc.favorite ? 'fill-current' : ''" />
        </button>

        <button
          class="shrink-0 h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-text/50 hover:text-text"
          @click="handleRemove($event, doc.id)"
          title="移除"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>
</template>
```

- [ ] **Step 3: 保留原有 script 中的工具函数**

`formatDate`、`formatSize`、`handleClick`、`handleRemove`、`handleToggleStar` 保持不变。

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/DocumentList.vue
git commit -m "refactor: add file type badges, use Tailwind in DocumentList"
```

---

### Task 8: ContentViewer.vue — Tailwind 重构

**Files:**
- Modify: `src/components/viewer/ContentViewer.vue`

- [ ] **Step 1: 重写 ContentViewer.vue template**

```vue
<!-- src/components/viewer/ContentViewer.vue -->
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
      <span class="text-base font-semibold truncate flex-1 text-title">
        {{ documentStore.currentDoc.meta.name }}
      </span>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="编辑">
        <Edit3 class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="复制">
        <Copy class="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" class="text-text/50 hover:bg-hover" title="更多">
        <MoreHorizontal class="w-4 h-4" />
      </Button>
    </div>

    <!-- Content scroll -->
    <div class="flex-1 overflow-y-auto" @click="handleContentClick">
      <div class="markdown-content" v-html="documentStore.currentDoc.html" />
    </div>
  </div>
</template>
```

Script 部分保持不变（highlightText、clearHighlights 等逻辑不变）。

- [ ] **Step 2: Commit**

```bash
git add src/components/viewer/ContentViewer.vue
git commit -m "refactor: use Tailwind classes in ContentViewer"
```

---

### Task 9: StatusBar.vue — 轻量状态行

**Files:**
- Modify: `src/components/layout/StatusBar.vue`

**重大变化：** 从全宽蓝色条改为内容区底部轻量文字行

- [ ] **Step 1: 重写 StatusBar.vue**

```vue
<!-- src/components/layout/StatusBar.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'

const documentStore = useDocumentStore()

const stats = computed(() => {
  const doc = documentStore.currentDoc
  if (!doc) return null
  const wordCount = doc.raw.split(/\s+/).filter(w => w.length > 0).length
  const lineCount = doc.raw.split('\n').length
  const size = doc.meta.size > 1024 * 1024
    ? `${(doc.meta.size / (1024 * 1024)).toFixed(1)} MB`
    : doc.meta.size > 1024
    ? `${(doc.meta.size / 1024).toFixed(1)} KB`
    : `${doc.meta.size} B`
  const modified = doc.meta.modified
    ? new Date(doc.meta.modified).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '未知'
  return {
    totalDocs: documentStore.openedDocs.length,
    wordCount,
    lineCount,
    size,
    modified,
  }
})
</script>

<template>
  <footer
    class="flex items-center justify-between h-7 px-4 text-xs select-none shrink-0 bg-bg border-t border-border text-text/60"
  >
    <span>总计: {{ stats?.totalDocs ?? 0 }} 个文档</span>
    <span v-if="stats" class="space-x-2">
      <span>字数: {{ stats.wordCount.toLocaleString() }}</span>
      <span>|</span>
      <span>行数: {{ stats.lineCount }}</span>
      <span>|</span>
      <span>大小: {{ stats.size }}</span>
      <span>|</span>
      <span>修改时间: {{ stats.modified }}</span>
    </span>
  </footer>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/StatusBar.vue
git commit -m "refactor: lightweight status bar at content area bottom"
```

---

### Task 10: SearchOverlay.vue — Tailwind 重构

**Files:**
- Modify: `src/components/search/SearchOverlay.vue`

- [ ] **Step 1: 更新搜索面板样式**

将 overlay 容器和输入框改为 Tailwind 类：

```vue
<!-- 在 SearchOverlay.vue 中修改 template 部分 -->
<template>
  <Teleport to="body">
    <div
      v-if="searchStore.isOpen"
      class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      data-overlay="true"
      style="background-color: rgba(0,0,0,0.5);"
      @click="handleOverlayClick"
    >
      <div
        class="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl bg-surface border border-border"
        @click.stop
        @keydown="handleKeyDown"
      >
        <!-- Search input -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search class="w-5 h-5 text-text/40" />
          <input
            ref="inputRef"
            type="text"
            class="flex-1 bg-transparent border-none outline-none text-base text-text"
            placeholder="搜索文档内容..."
            @input="handleInput"
          />
          <button class="text-text/40 hover:text-text" @click="searchStore.doCloseSearch()">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Indexing progress -->
        <div
          v-if="searchStore.isIndexing"
          class="flex items-center gap-2 px-4 py-3 text-xs text-text/50"
        >
          <Loader2 class="w-3.5 h-3.5 animate-spin" />
          索引构建中 ({{ searchStore.indexProgress.current }}/{{ searchStore.indexProgress.total }})...
        </div>

        <!-- Search results -->
        <ScrollArea v-if="searchStore.results.length > 0" class="max-h-64">
          <div class="py-1">
            <div
              v-for="(result, index) in searchStore.results" :key="result.docId"
              class="flex flex-col gap-0.5 px-4 py-2.5 cursor-pointer rounded-md mx-1"
              :class="{
                'bg-active': index === selectedIndex,
                'hover:bg-hover': index !== selectedIndex,
              }"
              @click="handleSelect(result)"
              @mouseenter="selectedIndex = index"
            >
              <div class="flex items-center gap-2">
                <FileText class="w-4 h-4 shrink-0 text-text/50" />
                <span class="text-sm truncate text-title">{{ result.fileName }}</span>
                <CornerDownLeft v-if="index === selectedIndex" class="w-3.5 h-3.5 text-text/30 shrink-0 ml-auto" />
              </div>
              <div v-if="result.snippet" class="text-xs truncate pl-6 text-text/70" v-html="highlightSnippet(result.snippet, searchStore.query)" />
              <div v-if="result.line > 0" class="text-xs text-text/30 pl-6">
                Line {{ result.line }}
              </div>
            </div>
          </div>
        </ScrollArea>

        <!-- No results -->
        <div
          v-if="searchStore.query && !searchStore.isSearching && !searchStore.isIndexing && searchStore.results.length === 0"
          class="px-4 py-6 text-center"
        >
          <span class="text-sm text-text/40">未找到匹配的文档</span>
        </div>

        <!-- Search history -->
        <div v-if="!searchStore.query && searchStore.searchHistory.length > 0" class="border-t border-border">
          <div class="px-4 py-1.5 text-xs text-text/40">最近搜索</div>
          <div
            v-for="(item, index) in searchStore.searchHistory.slice(0, 5)" :key="index"
            class="flex items-center gap-2 px-4 py-1.5 cursor-pointer hover:bg-hover text-sm text-text rounded-md mx-1"
            @click="handleInput({ target: { value: item } } as any)"
          >
            <Clock class="w-3.5 h-3.5 text-text/40" />
            {{ item }}
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

Script 部分保持不变。

- [ ] **Step 2: Commit**

```bash
git add src/components/search/SearchOverlay.vue
git commit -m "refactor: use Tailwind classes in SearchOverlay"
```

---

### Task 11: WelcomePage.vue — Tailwind 重构

**Files:**
- Modify: `src/pages/WelcomePage.vue`

- [ ] **Step 1: 重写 WelcomePage.vue**

```vue
<!-- src/pages/WelcomePage.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useDocumentStore } from '@/stores/documentStore'
import { openFileDialog } from '@/services/tauriService'
import { FolderOpen, Files } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const documentStore = useDocumentStore()
const isDragging = ref(false)

async function handleOpenFolder() {
  const folder = await openFileDialog()
  if (folder) await documentStore.doScanDirectory(folder)
}

function handleDragOver() {
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return

  for (const file of Array.from(files)) {
    const path = (file as any).path as string
    if (path) {
      await documentStore.doScanDirectory(path)
      break
    }
  }
}
</script>

<template>
  <div
    class="h-full flex flex-col items-center justify-center transition-all duration-200"
    :class="{
      'bg-active border-2 border-dashed border-primary': isDragging,
      'bg-bg': !isDragging,
    }"
    @dragover.prevent="handleDragOver"
    @dragleave="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 大 Logo -->
    <div
      class="w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-primary"
    >
      <Files class="w-7 h-7 text-white" />
    </div>

    <h1 class="text-2xl font-bold mb-1 text-title">DocViewer</h1>
    <p class="text-sm mb-6 text-text/40">面向开发者的本地知识库</p>

    <p class="text-base mb-4 text-center" :class="isDragging ? 'text-text/80' : 'text-text/50'">
      {{ isDragging ? '释放以打开文件夹' : '拖拽 Markdown 文件夹到此处' }}
    </p>
    <p v-if="!isDragging" class="text-sm mb-6 text-center text-text/30">
      或点击按钮选择文件夹
    </p>

    <Button class="bg-primary text-white hover:bg-primary/90 px-6 py-2.5" @click="handleOpenFolder">
      <FolderOpen class="w-5 h-5" />
      选择文件夹
    </Button>

    <div class="mt-10 flex gap-6 text-xs text-text/25">
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+K</kbd> 搜索</span>
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+D</kbd> 收藏</span>
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+W</kbd> 关闭</span>
      <span><kbd class="bg-panel border border-border rounded px-1.5 py-0.5">Ctrl+\</kbd> 侧边栏</span>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/WelcomePage.vue
git commit -m "refactor: use Tailwind classes in WelcomePage"
```

---

### Task 12: DocTreeRecursive.vue — Tailwind + 移除 JS hover

**Files:**
- Modify: `src/components/sidebar/DocTreeRecursive.vue`

- [ ] **Step 1: 重写 DocTreeRecursive.vue**

```vue
<!-- src/components/sidebar/DocTreeRecursive.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { DocMeta } from '@/types/document'
import { useDocumentStore } from '@/stores/documentStore'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, X } from 'lucide-vue-next'

const props = defineProps<{
  doc: DocMeta
  depth: number
  shouldAutoExpand: boolean
}>()

const documentStore = useDocumentStore()

function isExpanded(id: string) { return documentStore.expandedDirs.has(id) }
function isActive(id: string) { return documentStore.currentDoc?.meta.id === id }

function handleClick(doc: DocMeta) {
  if (doc.children) {
    documentStore.doToggleExpanded(doc.id)
  } else {
    documentStore.doOpenDoc(doc)
  }
}

const isRoot = computed(() => props.depth === 0 && props.doc.children)

function handleRemove(event: Event) {
  event.stopPropagation()
  documentStore.doRemoveRootFolder(props.doc.id)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-1.5 cursor-pointer text-sm transition-colors rounded-md group"
      :data-docid="doc.id"
      :class="{
        'bg-active text-title': isActive(doc.id),
        'text-text hover:bg-hover': !isActive(doc.id),
      }"
      :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
      @click="handleClick(doc)"
    >
      <template v-if="doc.children">
        <ChevronDown v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-3.5 h-3.5 shrink-0 text-text/40" />
        <ChevronRight v-else class="w-3.5 h-3.5 shrink-0 text-text/40" />
        <FolderOpen v-if="isExpanded(doc.id) || shouldAutoExpand" class="w-4 h-4 shrink-0 text-amber-500" />
        <Folder v-else class="w-4 h-4 shrink-0 text-amber-500" />
      </template>
      <FileText v-else class="w-4 h-4 shrink-0 text-text/50" />
      <span class="truncate">{{ doc.name }}</span>
      <button
        v-if="isRoot"
        class="ml-auto h-5 w-5 flex items-center justify-center rounded hover:bg-hover opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        @click="handleRemove"
        title="移除文件夹"
      >
        <X class="w-3 h-3 text-text/50" />
      </button>
    </div>
    <template v-if="doc.children && (isExpanded(doc.id) || shouldAutoExpand)">
      <DocTreeRecursive
        v-for="child in doc.children"
        :key="child.id"
        :doc="child"
        :depth="depth + 1"
        :should-auto-expand="shouldAutoExpand"
      />
    </template>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar/DocTreeRecursive.vue
git commit -m "refactor: use Tailwind, remove JS hover in DocTreeRecursive"
```

---

### Task 13: MainLayout.vue — Tailwind 布局类

**Files:**
- Modify: `src/layouts/MainLayout.vue`

- [ ] **Step 1: 重写 MainLayout.vue**

```vue
<!-- src/layouts/MainLayout.vue -->
<script setup lang="ts">
import { useSettingStore } from '@/stores/settingStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import DocumentList from '@/components/layout/DocumentList.vue'
import StatusBar from '@/components/layout/StatusBar.vue'

const settingStore = useSettingStore()
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-bg">
    <!-- Top header bar -->
    <AppHeader />

    <!-- Three-column body -->
    <div class="flex flex-1 overflow-hidden border-t border-border">
      <!-- Left: Navigation sidebar -->
      <Sidebar
        v-show="!settingStore.sidebarCollapsed"
        class="shrink-0 overflow-hidden"
        :style="{ width: settingStore.sidebarWidth + 'px' }"
      />

      <!-- Middle: Document list -->
      <DocumentList class="shrink-0 overflow-hidden" style="width: 320px;" />

      <!-- Right: Content viewer -->
      <main class="flex-1 min-w-0 overflow-hidden">
        <slot />
      </main>
    </div>

    <!-- Bottom status bar -->
    <StatusBar />
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/MainLayout.vue
git commit -m "refactor: use Tailwind layout classes in MainLayout"
```

---

### Task 14: 小改组件适配

**Files:**
- Modify: `src/components/sidebar/DocTree.vue`
- Modify: `src/components/sidebar/FavoritesList.vue`
- Modify: `src/components/sidebar/RecentList.vue`

这些小改组件主要是将 inline style 替换为 Tailwind 类。

- [ ] **Step 1: DocTree.vue 适配**

将 `style="color: var(--text); opacity: 0.4;"` 等替换为 `class="text-text/40"`。

- [ ] **Step 2: FavoritesList.vue 适配**

同样替换 inline style 为 Tailwind 类。

- [ ] **Step 3: RecentList.vue 适配**

同上。

- [ ] **Step 4: Commit**

```bash
git add src/components/sidebar/DocTree.vue src/components/sidebar/FavoritesList.vue src/components/sidebar/RecentList.vue
git commit -m "refactor: replace inline styles with Tailwind in sidebar components"
```

---

## 验证与收尾

### Task 15: 全面测试与修复

- [ ] **Step 1: 运行开发服务器**

Run: `npm run dev`
Expected: 无编译错误，Vite 正常启动

- [ ] **Step 2: 手动测试清单**

逐项测试以下功能：

1. **主题切换**：点击 Header 太阳/月亮图标，确认深色/浅色主题正确切换
2. **搜索功能**：点击搜索框或按 Ctrl+K，SearchOverlay 正常打开
3. **文件夹展开**：侧边栏文件夹可正常展开/折叠
4. **文档打开**：点击文档列表项，内容正确显示
5. **收藏功能**：星标按钮正常工作
6. **窗口控制**：最小化、最大化、关闭按钮正常工作
7. **拖拽打开**：WelcomePage 拖拽区域正常工作
8. **Hover 效果**：所有列表项、按钮 hover 时有正确的背景色变化

- [ ] **Step 3: 修复发现的问题**

如果测试中发现任何问题，及时修复。

- [ ] **Step 4: 最终 Commit**

```bash
git add .
git commit -m "chore: final fixes after comprehensive testing"
```

---

## 总结

本计划共 15 个任务，预计完成时间约 2-3 小时（含测试）。每个任务都是独立的，可以分次执行。推荐执行顺序：

1. Task 1-3: UI 组件变体适配（前置）
2. Task 4: 全局样式重构
3. Task 5-12: 逐个组件改造
4. Task 13-14: 布局和小组件适配
5. Task 15: 全面测试

执行时建议使用 subagent-driven-development，每个任务由独立子代理执行，主代理审核。
