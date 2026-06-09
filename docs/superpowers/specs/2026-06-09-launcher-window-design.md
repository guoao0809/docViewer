# DocViewer 小窗模式设计文档

> 最小化时弹出独立浮动小窗，提供快速搜索和最近文档访问。

## 概述

**目标**：点击最小化按钮时，主窗口隐藏，弹出一个独立 Tauri 浮动小窗（类似 Spotlight），提供搜索框 + 最近文档列表，支持快速查找和打开文档。关闭小窗后主窗口保持最小化，用户从任务栏恢复。

**触发方式**：仅点击最小化按钮。

**窗口类型**：独立 Tauri 无边框窗口（静态配置，两份 WebView 实例）。

## 架构设计

### 双窗口模型

```
┌─ tauri.conf.json ──────────────────────────┐
│  windows:                                   │
│    main:     1400×900, 无边框, 可见         │
│    launcher:  480×auto, 无边框, 初始隐藏     │
│         ↓                                  │
│  index.html ← 两个窗口加载同一入口            │
│         ↓                                  │
│  App.vue ← 检测 window.label                │
│    ├─ "main"     → MainLayout               │
│    └─ "launcher" → LauncherPage              │
│         ↓                                  │
│  Pinia stores ← localStorage 共享           │
│  Tauri events ← 窗口间实时通知               │
└─────────────────────────────────────────────┘
```

### 窗口属性

| 属性 | main（主窗口） | launcher（小窗） |
|---|---|---|
| label | `main` | `launcher` |
| 尺寸 | 1400×900 | 480×auto |
| 最小尺寸 | 900×500 | 400×300 |
| 装饰栏 | false | false |
| 居中 | true | false（手动定位顶部居中） |
| 可调整大小 | true | false |
| 初始可见 | true | false |
| skipTaskbar | false | true |
| alwaysOnTop | false | true |

### 生命周期

```
最小化按钮点击
  → main.hide()
  → launcher 定位屏幕顶部居中 (top≈15vh)
  → launcher.show() + setFocus()
  
小窗中选择文档
  → launcher emit('launcher:open-doc', { docId })
  → main 加载文档 + show() + focus()
  → launcher.hide()

关闭小窗 (Esc / X)
  → launcher.hide()
  → 主窗口保持隐藏（用户从任务栏恢复）

从任务栏恢复主窗口
  → main.show()
  → 若小窗显示中 → launcher.hide()
  
直接关闭主窗口 (X 按钮)
  → launcher.close()（若显示中）
  → main.close()
  → 应用退出
```

## 窗口间通信

### Tauri 事件

| 事件名 | 方向 | 载荷 | 说明 |
|---|---|---|---|
| `launcher:show` | main → launcher | 无 | 主窗口最小化，通知小窗显示 |
| `launcher:close` | main → launcher | 无 | 主窗口恢复，通知小窗关闭 |
| `launcher:open-doc` | launcher → main | `{ docId: string }` | 用户在小窗选择了文档 |

### 状态共享

| 数据类型 | 同步方式 |
|---|---|
| 文档树、收藏、历史、openedDocs | localStorage — 小窗启动时加载 |
| 实时 UI 状态 | 各窗口独立管理 |
| 文档打开通知 | Tauri events（实时） |

## 小窗 UI 布局

```
┌──────────────────────────────────┐
│  [D] DocViewer              [X]  │  标题栏 (40px)
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │ 🔍 搜索文档 (Ctrl+K) [搜索]  │  │  搜索区 (52px)
│  └────────────────────────────┘  │
│  📋 最近文档                     │  列表标题 (28px)
│  ┌────────────────────────────┐  │
│  │ [M↓] README.md       2KB   │  │  文档条目
│  │       docviewer     06/09  │  │  - 文件类型徽章 + 文件名
│  │ [M↓] CLAUDE.md       3KB   │  │  - 文件夹标签 + 日期
│  │       docviewer     06/09  │  │
│  └────────────────────────────┘  │  (最多 6 条，超出滚动)
├──────────────────────────────────┤
│  🔄 最近文档    ⌨️ 快捷键        │  底部栏 (36px)
└──────────────────────────────────┘
```

### 交互规则

- **搜索输入**：实时过滤，结果替换最近文档列表（复用 searchStore）
- **点击文档**：打开文档 → 关闭小窗 → 恢复主窗口加载文档
- **Esc / X**：关闭小窗，主窗口保持最小化
- **拖拽**：标题栏 data-tauri-drag-region 支持拖拽

## 边界情况

| 场景 | 处理 |
|---|---|
| 小窗已显示时再次点击最小化 | 忽略（幂等） |
| 无已打开文件夹 | 搜索无结果，提示"请先添加文件夹" |
| 无最近文档 | 列表空状态："从主窗口打开文档" |
| 直接关闭主窗口 (X) | 同时关闭小窗，应用退出 |
| 小窗拖拽后再次打开 | 恢复默认位置（不记忆） |

## 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 新建 | `src/pages/LauncherPage.vue` | 小窗页面组件 |
| 新建 | `src/stores/windowStore.ts` | 窗口通信状态管理 |
| 新建 | `src/composables/useLauncher.ts` | 小窗逻辑 composable |
| 修改 | `src-tauri/tauri.conf.json` | 添加 launcher 窗口定义 |
| 修改 | `src-tauri/capabilities/default.json` | 扩展窗口/事件权限 |
| 修改 | `src/App.vue` | 根据 label 条件渲染 |
| 修改 | `src/components/layout/AppHeader.vue` | 最小化按钮改为触发小窗 |

## 权限需求

`capabilities/default.json` 新增：

```json
"core:window:allow-show",
"core:window:allow-hide",
"core:window:allow-set-focus",
"core:window:allow-set-position",
"core:window:allow-set-size",
"core:window:allow-set-resizable",
"core:window:allow-set-skip-taskbar",
"core:window:allow-set-always-on-top",
"core:event:allow-emit",
"core:event:allow-listen"
```
