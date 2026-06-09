import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCurrentWindow, LogicalPosition, LogicalSize } from '@tauri-apps/api/window'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
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

    const launcher = await WebviewWindow.getByLabel('launcher')
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
    await launcher.setPosition(new LogicalPosition(x, y))
    await launcher.setSize(new LogicalSize(480, 460))
    await launcher.show()
    await launcher.setFocus()

    isLauncherVisible.value = true
  }

  /** 主窗口: 恢复 → 关闭小窗 */
  async function doHideLauncher() {
    if (currentLabel.value !== 'main') return

    const launcher = await WebviewWindow.getByLabel('launcher')
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
