# DocViewer

> 面向开发者的本地知识库 — 快速阅读和管理本地文档

DocViewer 是一款基于 Tauri 2 的桌面应用，提供原生的文档阅读体验。支持 Markdown、代码文件等多种格式，内置全文搜索、语法高亮、双主题切换等功能，所有数据本地存储，无需联网。

![Dark Theme](docs/screenshots/dark.png)
![Light Theme](docs/screenshots/light.png)

## ✨ 特性

### 📁 文件支持

| 格式 | 扩展名 | 渲染方式 |
|---|---|---|
| Markdown | `.md`, `.markdown` | 完整渲染 + 语法高亮 |
| 代码/配置 | `.json`, `.yaml`, `.yml`, `.toml`, `.xml`, `.csv` | 纯文本显示 |
| 文本 | `.txt` | 纯文本显示 |

- 自动检测文件编码（UTF-8/UTF-16/GBK/Shift-JIS 等）
- 支持多个文件夹同时打开
- 拖拽文件夹到窗口即可打开

### 🔍 全文搜索

- 基于 MiniSearch 的内存倒排索引，毫秒级响应
- 支持模糊匹配（容错拼写错误）和前缀匹配
- 搜索结果展示上下文片段和行号
- 跳转到文档后自动高亮匹配内容并滚动到位置
- 搜索历史持久化（最多 20 条），支持单条删除和清空

### 🎨 界面

- **深色 / 浅色双主题**，一键切换
- **三栏布局**：导航侧边栏 | 文档列表 | 内容阅读区
- **可拖拽调整宽度**：侧边栏（180–400px）和文档列表（220–500px）
- **彩色文件类型徽章**：Markdown（蓝）、JSON（黄）、PDF（红）、其他（绿）
- 自定义无框窗口，带最小化 / 最大化 / 关闭按钮
- 自定义滚动条样式

### ⌨️ 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl/⌘ + K` | 打开搜索 |
| `Ctrl/⌘ + D` | 收藏 / 取消收藏当前文档 |
| `Ctrl/ + W` | 关闭当前文档 |
| `Ctrl/⌘ + Tab` | 切换到下一篇文档 |
| `Ctrl/⌘ + Shift + Tab` | 切换到上一篇文档 |
| `Ctrl/⌘ + \` | 切换侧边栏显示 |
| `Escape` | 关闭搜索面板 |
| `↑` / `↓` | 在搜索结果中导航 |
| `Enter` | 打开选中的搜索结果 |

### 📝 Markdown 渲染

- 基于 markdown-it，支持表格、代码块、引用、链接等
- Shiki 语法高亮（vitesse-dark / vitesse-light 主题），支持 17+ 语言
- 标题锚点链接，hover 显示 `#` 符号
- DOMPurify HTML 安全过滤
- 自动生成目录（TOC）

### 💾 数据持久化

所有状态自动保存到 `localStorage`，重启后恢复：

- 已打开的文件夹路径和文档树结构
- 文档收藏状态、最后打开时间、访问次数
- 主题偏好、侧边栏宽度和折叠状态
- 搜索历史记录

## 🛠️ 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Tauri 2.11（Rust + WebView） |
| 前端 | Vue 3.5 + TypeScript + Vite 8 |
| 状态管理 | Pinia 3 |
| 样式 | Tailwind CSS 4 + 语义化 Token |
| Markdown | markdown-it + Shiki + DOMPurify |
| 搜索 | MiniSearch 7 |
| 图标 | Lucide Vue Next |
| UI 组件 | Reka UI + CVA |
| 编码检测 | encoding_rs |

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust 1.77+（[安装指南](https://www.rust-lang.org/tools/install)）
- Tauri 依赖（[平台要求](https://v2.tauri.app/start/prerequisites/)）

### 安装与运行

```bash
# 克隆项目
git clone <repo-url>
cd docviewer

# 安装依赖
npm install

# 开发模式（仅前端）
npm run dev

# 完整 Tauri 开发模式（Rust + 前端 + 原生窗口）
npm run tauri dev

# 生产构建
npm run build
npm run tauri build
```

### 命令说明

| 命令 | 说明 |
|---|---|
| `npm run dev` | Vite 开发服务器（端口 1420） |
| `npm run build` | TypeScript 类型检查 + Vite 生产构建 |
| `npm run tauri dev` | 完整 Tauri 开发模式 |
| `npm run tauri build` | 生产构建（前端 + Rust，生成安装包） |

## 📂 项目结构

```
docviewer/
├── src/                    # 前端源码
│   ├── components/
│   │   ├── layout/         # 布局组件（Header, Sidebar, DocumentList, StatusBar）
│   │   ├── search/         # 搜索面板
│   │   ├── sidebar/        # 文件夹树组件
│   │   ├── ui/             # 基础 UI 组件（Button, Badge, ScrollArea 等）
│   │   ── viewer/         # 文档内容查看器
│   ├── composables/        # 组合式函数（键盘快捷键）
│   ├── layouts/            # 页面布局
│   ├── pages/              # 页面（欢迎页）
│   ├── services/           # 服务层（Tauri IPC, Markdown 解析, 搜索）
│   ├── stores/             # Pinia 状态管理
│   ├── types/              # TypeScript 类型定义
│   ├── App.vue             # 应用入口
│   ├── main.ts             # 挂载入口
│   └── style.css           # 全局样式 + 主题变量
├── src-tauri/              # Rust 后端
│   ├── src/lib.rs          # Tauri 命令（扫描目录、读取文件、获取元数据）
│   ├── capabilities/       # 权限配置
│   └── tauri.conf.json     # Tauri 应用配置
└── package.json
```

##  许可证

ISC
