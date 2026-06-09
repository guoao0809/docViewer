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
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow')
      const { LogicalPosition, LogicalSize } = await import('@tauri-apps/api/dpi')
      const launcher = WebviewWindow.getCurrent()
      const y = Math.round(window.screen.height * 0.15)
      const x = Math.round((window.screen.width - 480) / 2)
      await launcher.setPosition(new LogicalPosition(x, y))
      await launcher.setSize(new LogicalSize(480, 460))
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
