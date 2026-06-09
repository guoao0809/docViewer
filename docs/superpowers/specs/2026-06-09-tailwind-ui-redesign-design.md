# DocViewer Tailwind UI 改造设计文档

> 日期：2026-06-09
> 状态：用户已批准

## 1. 概述

使用 Tailwind CSS v4 对 DocViewer 进行全面 UI 重构，参照用户提供的设计图（浅色 + 深色双主题），替换现有 inline style + CSS 变量混用方式为 Tailwind 工具类 + 语义化颜色 token 体系。

## 2. 需求确认

| 项目 | 决策 |
|---|---|
| 主题 | 保留深色/浅色双主题切换 |
| 小窗口模式 | 暂不做 |
| 侧边栏功能 | 保留最近打开/收藏夹占位，后续补充 |
| 文档列表 | 仅展示已打开文档（保持当前行为） |
| 方案选择 | 方案 B：全面重构 + Tailwind |

## 3. 布局结构（根据新设计图更新）

```
┌─────────────────────────────────────────────────────
│  [D] DocViewer    [🔍 搜索文档... Ctrl+K]   ☀ ☰  □ ✕ │  ← AppHeader
├──────────┬──────────────────────┬────────────────────┤
│          │  全部文档             │                    │
│ + 添加文档 │  共 1287 个文档    ⧉  │  DocViewer V2.0    │
│          │                     │  设计文档       ✎  ⋮ │
│  最近打开 │ ┌─────────────────┐ │                    │
│ ⭐ 收藏夹  │ │ M↓ 设计文档.md   ☆ │ │  1. 项目概述       │
│ 📄 全部文档 │ │ 10:30  12.5KB   │ │                    │
│ 🔍 搜索历史 │ ├─────────────────┤ │  正文内容...        │
│          │ │ J  package-lock   ☆ │ │                    │
│ 项目    +  │ │ 06-05  22.1KB   │ │                    │
│ └ 开发文档(8)│ ├─────────────────┤ │                    │
│   M figmamcp │ │ PDF 产品需求    ☆ │ │                    │
│   M hbuilder │ │ 06-04  2.3MB   │ │                    │
│ └ 产品设计(2) │ └─────────────────┘ │                    │
│ └ 技术文档(4) │                     │                    │
│ └ 学习资料(1) │                     │                    │
│ └ 个人笔记(1) │                     │                    │
│          │                     │                    │
│ ⚙ 设置    │                     │ 字数 行数 大小 时间  │ ← StatusBar
└──────────┴──────────────────────┴────────────────────┘
```

### 关键布局变化（对比当前实现）

1. **搜索栏居中**：从 AppHeader 左侧移至顶部中央，占据更大宽度
2. **文件夹树整合到左侧边栏**：当前 DocTree 在 Sidebar 内部，新设计中文件夹树直接在导航项下方展开，不再需要独立的中间文件夹面板
3. **文件类型彩色徽章**：文档列表中的文件图标改为带字母的彩色方块（M↓=蓝色、J=黄色、PDF=红色、SK=灰色）
4. **状态栏简化**：从全宽蓝色条改为内容区底部的轻量文字行
5. **Header 图标变化**：新增主题切换（☀/🌙）、菜单（☰）图标

## 4. 主题与颜色体系

### 4.1 Tailwind @theme 语义化 Token

在 `style.css` 中通过 `@theme` 定义，组件中使用 `bg-bg`、`text-title` 等类名：

```css
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
```

### 4.2 浅色主题

```css
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
}
```

### 4.3 深色主题

```css
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
}
```

### 4.4 文件类型徽章颜色

| 类型 | 背景色 | 文字色 | 字母 |
|---|---|---|---|
| Markdown | `bg-blue-500` | `text-white` | M↓ |
| JSON | `bg-yellow-500` | `text-white` | J |
| PDF | `bg-red-500` | `text-white` | PDF |
| Sketch | `bg-gray-400` | `text-white` | SK |
| 其他代码 | `bg-green-500` | `text-white` | 扩展名 |

## 5. 组件改造详情

### 5.1 style.css — 全局样式重构

- 引入 `@theme` 语义化 token
- 保留 `:root[data-theme]` CSS 变量定义
- `.markdown-content` 样式保留为 CSS 类（动态 HTML 需要），但变量引用更新
- 滚动条样式保留
- 移除 `*` 重置（Tailwind Preflight 已包含）

### 5.2 AppHeader.vue

**布局变化**：
- 搜索栏从左侧移至中央，宽度更大（`max-w-2xl`）
- 左侧：Logo + 名称
- 中央：搜索入口（点击触发 SearchOverlay）
- 右侧：主题切换图标 + 菜单图标 + 窗口控制

**样式改造**：
- `bg-surface border-b border-border` 替代 inline style
- 搜索框：`bg-bg border border-border rounded-lg text-sm`
- 窗口按钮：`hover:bg-hover rounded` + `size="icon"` (Button 组件)
- 移除所有 JS hover 逻辑

### 5.3 Sidebar.vue

**结构变化**：
- 导航项 + 文件夹树整合在同一区域
- 文件夹树直接在导航项下方，支持展开/折叠
- 最近打开/收藏夹保留为占位导航项

**样式改造**：
- 添加文档按钮：`bg-primary text-white rounded-lg font-medium py-2.5`
- 导航项：`hover:bg-hover rounded-md px-3 py-2 text-sm`
- 活跃项：`bg-active text-title font-medium`
- 文件夹项：显示文档计数 `(8)`，用 `text-text/60 text-xs`
- 设置项固定在底部：`mt-auto border-t border-border`

### 5.4 DocumentList.vue

**文件图标改造**：
- 移除 lucide 的 `FileText`/`FileCode` 图标
- 改为彩色字母徽章：`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold text-white`
- 根据文件扩展名映射颜色和字母

**列表项样式**：
- `hover:bg-hover border-b border-border px-4 py-3`
- 活跃项：`bg-active`
- 收藏星标：右侧显示，`text-amber-400` / `text-text/20`
- 移除所有 JS hover → `hover:bg-hover`

### 5.5 ContentViewer.vue

**标题栏**：
- `border-b border-border px-6 h-12`
- 操作按钮：`hover:bg-hover rounded-md p-2`

**内容区**：
- `flex-1 overflow-y-auto bg-bg`
- `.markdown-content` 样式保留但更新变量

**空状态**：
- `flex flex-col items-center justify-center h-full`

### 5.6 StatusBar.vue

**重大变化**：从全宽蓝色条 → 内容区底部轻量行

- `text-xs text-text/60 bg-bg border-t border-border px-4 h-7`
- 内容：`字数: 1,850 | 行数: 88 | 大小: 18.5 KB | 修改时间: 2024-06-08 11:15`
- 左侧显示总计文档数

### 5.7 SearchOverlay.vue

- 搜索面板：`bg-surface border border-border rounded-xl shadow-2xl`
- 输入框：`bg-transparent border-none outline-none text-base`
- 结果项：`hover:bg-hover rounded-md px-4 py-2.5`
- 高亮 `<mark>` 保留 inline style（动态生成）

### 5.8 WelcomePage.vue

- 拖拽区域：`border-2 border-dashed border-border rounded-xl`
- 拖拽中：`border-primary bg-active`
- kbd 快捷键：`bg-panel border border-border rounded px-1.5 py-0.5 text-xs`

### 5.9 DocTreeRecursive.vue

- 节点：`hover:bg-hover rounded-md px-2 py-1`
- 活跃节点：`bg-active text-title`
- 展开图标：`text-text/40`
- 文件夹图标：`text-amber-500`（浅色）/ `text-amber-400`（深色）
- 移除所有 JS hover → `hover:bg-hover`

## 6. UI 组件复用策略

项目已有 `src/components/ui/` 目录（基于 reka-ui + CVA + tailwind-merge）：

| 组件 | 使用场景 |
|---|---|
| `Button` | 所有按钮（variant: default/ghost/outline, size: default/icon/sm） |
| `Input` | SearchOverlay 输入框 |
| `ScrollArea` | 文档列表、侧边栏、内容区滚动容器 |
| `Separator` | 侧边栏分区、文档列表分隔 |
| `Tooltip` | 图标按钮的 tooltip 提示 |
| `Badge` | 文档计数、文件夹标签 |
| `Dialog` | 未来设置弹窗等 |

**不引入额外 UI 库**，只用已有组件 + Tailwind。保持依赖最小化。

**注意**：文档列表标题显示「全部文档」，但实际内容为已打开文档列表（保持当前行为）。这是展示层命名，后续可改为动态标题。

## 7. 改造文件清单

| 文件 | 改动类型 |
|---|---|
| `src/style.css` | 重写：@theme + CSS 变量 + markdown 样式 |
| `src/layouts/MainLayout.vue` | 重构：Tailwind 布局类 |
| `src/components/layout/AppHeader.vue` | 重构：搜索栏居中 + Tailwind |
| `src/components/layout/Sidebar.vue` | 重构：导航+文件夹树整合 |
| `src/components/layout/DocumentList.vue` | 重构：彩色文件徽章 + Tailwind |
| `src/components/layout/StatusBar.vue` | 重构：轻量状态行 |
| `src/components/viewer/ContentViewer.vue` | 重构：Tailwind |
| `src/components/search/SearchOverlay.vue` | 重构：Tailwind |
| `src/pages/WelcomePage.vue` | 重构：Tailwind |
| `src/components/sidebar/DocTreeRecursive.vue` | 重构：Tailwind + 移除 JS hover |
| `src/components/sidebar/DocTree.vue` | 小改：适配新样式 |
| `src/components/sidebar/FavoritesList.vue` | 小改：适配新样式 |
| `src/components/sidebar/RecentList.vue` | 小改：适配新样式 |

## 8. 不变的部分

- **Pinia stores**：所有 store 逻辑不变
- **Services**：tauriService、markdownService、searchService 不变
- **Types**：类型定义不变
- **Rust backend**：完全不变
- **Keyboard shortcuts**：快捷键逻辑不变
- **主题切换机制**：`settingStore.doToggleTheme()` + `data-theme` 属性不变
- **文件扫描/读取逻辑**：不变

## 9. 风险与注意事项

1. **Shiki 代码高亮主题**：`vitesse-dark` / `vitesse-light` 需要确认与新配色协调
2. **Markdown 动态 HTML**：`.markdown-content` 样式必须保留 CSS 类方式，不能完全用 Tailwind
3. **Tauri 拖拽区域**：`data-tauri-drag-region` 属性必须保留在 header 上
4. **DOMPurify  sanitization**：搜索高亮的 `<mark>` 标签需要确保不被过滤
