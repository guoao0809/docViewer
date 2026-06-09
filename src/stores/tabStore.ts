import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { TabItem } from '@/types/tab'

const STORAGE_KEY = 'docviewer-tabs'

export const useTabStore = defineStore('tab', () => {
  const tabs = ref<TabItem[]>([])
  const activeTabId = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find(t => t.docId === activeTabId.value) ?? null)
  const tabOrder = computed(() => {
    const pinned = tabs.value.filter(t => t.pinned)
    const unpinned = tabs.value.filter(t => !t.pinned)
    return [...pinned, ...unpinned]
  })

  function persistState() {
    const state = {
      tabs: tabs.value,
      activeTabId: activeTabId.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const state = JSON.parse(raw)
      if (state.tabs) tabs.value = state.tabs as TabItem[]
      if (state.activeTabId) activeTabId.value = state.activeTabId as string
    } catch { /* ignore corrupted data */ }
  }

  function doOpenTab(docId: string, title: string) {
    const existing = tabs.value.find(t => t.docId === docId)
    if (existing) {
      activeTabId.value = docId
      persistState()
      return
    }
    tabs.value.push({ docId, title, pinned: false, scrollTop: 0 })
    activeTabId.value = docId
    persistState()
  }

  function doCloseTab(docId: string) {
    const index = tabs.value.findIndex(t => t.docId === docId)
    if (index === -1) return
    tabs.value.splice(index, 1)
    if (activeTabId.value === docId) {
      if (tabs.value.length === 0) {
        activeTabId.value = null
      } else {
        const newIndex = Math.min(index, tabs.value.length - 1)
        activeTabId.value = tabs.value[newIndex].docId
      }
    }
    persistState()
  }

  function doSetActiveTab(docId: string) { activeTabId.value = docId; persistState() }
  function doPinTab(docId: string) {
    const tab = tabs.value.find(t => t.docId === docId)
    if (tab) tab.pinned = !tab.pinned
    persistState()
  }
  function doSaveScrollPosition(docId: string, scrollTop: number) {
    const tab = tabs.value.find(t => t.docId === docId)
    if (tab) tab.scrollTop = scrollTop
    persistState()
  }

  // Auto-persist on changes
  watch(tabs, () => persistState(), { deep: true })
  watch(activeTabId, () => persistState())

  // Load persisted state on creation
  loadPersistedState()

  return { tabs, activeTabId, activeTab, tabOrder, doOpenTab, doCloseTab, doSetActiveTab, doPinTab, doSaveScrollPosition }
})