import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

export const useSettingStore = defineStore('setting', () => {
  const theme = ref<Theme>((localStorage.getItem('docviewer-theme') as Theme) || 'dark')
  const sidebarWidth = ref(Number(localStorage.getItem('docviewer-sidebar-width')) || 240)
  const tocPanelWidth = ref(Number(localStorage.getItem('docviewer-toc-width')) || 220)
  const sidebarCollapsed = ref(localStorage.getItem('docviewer-sidebar-collapsed') === 'true')
  const fontSize = ref(Number(localStorage.getItem('docviewer-font-size')) || 14)

  function applyTheme(t: Theme) {
    document.documentElement.setAttribute('data-theme', t)
  }
  applyTheme(theme.value)

  function doToggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(theme.value)
  }
  function doSetSidebarWidth(width: number) { sidebarWidth.value = Math.max(180, Math.min(400, width)) }
  function doToggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }

  watch(theme, (v) => localStorage.setItem('docviewer-theme', v))
  watch(sidebarWidth, (v) => localStorage.setItem('docviewer-sidebar-width', String(v)))
  watch(tocPanelWidth, (v) => localStorage.setItem('docviewer-toc-width', String(v)))
  watch(sidebarCollapsed, (v) => localStorage.setItem('docviewer-sidebar-collapsed', String(v)))
  watch(fontSize, (v) => localStorage.setItem('docviewer-font-size', String(v)))

  return { theme, sidebarWidth, tocPanelWidth, sidebarCollapsed, fontSize, doToggleTheme, doSetSidebarWidth, doToggleSidebar }
})
