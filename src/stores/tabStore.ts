import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TabItem } from '@/types/tab'

export const useTabStore = defineStore('tab', () => {
  const tabs = ref<TabItem[]>([])
  const activeTabId = ref<string | null>(null)

  const activeTab = computed(() => tabs.value.find(t => t.docId === activeTabId.value) ?? null)
  const tabOrder = computed(() => {
    const pinned = tabs.value.filter(t => t.pinned)
    const unpinned = tabs.value.filter(t => !t.pinned)
    return [...pinned, ...unpinned]
  })

  function doOpenTab(docId: string, title: string) {
    const existing = tabs.value.find(t => t.docId === docId)
    if (existing) {
      activeTabId.value = docId
      return
    }
    tabs.value.push({ docId, title, pinned: false, scrollTop: 0 })
    activeTabId.value = docId
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
  }

  function doSetActiveTab(docId: string) { activeTabId.value = docId }
  function doPinTab(docId: string) {
    const tab = tabs.value.find(t => t.docId === docId)
    if (tab) tab.pinned = !tab.pinned
  }
  function doSaveScrollPosition(docId: string, scrollTop: number) {
    const tab = tabs.value.find(t => t.docId === docId)
    if (tab) tab.scrollTop = scrollTop
  }

  return { tabs, activeTabId, activeTab, tabOrder, doOpenTab, doCloseTab, doSetActiveTab, doPinTab, doSaveScrollPosition }
})
