import { onMounted, onUnmounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useTabStore } from '@/stores/tabStore'
import { useSettingStore } from '@/stores/settingStore'

export function useKeyboard() {
  const searchStore = useSearchStore()
  const documentStore = useDocumentStore()
  const tabStore = useTabStore()
  const settingStore = useSettingStore()

  function handleKeyDown(event: KeyboardEvent) {
    const isMod = event.ctrlKey || event.metaKey

    if (isMod && event.key === 'k') {
      event.preventDefault()
      searchStore.doOpenSearch()
      return
    }

    if (isMod && event.key === 'd') {
      event.preventDefault()
      if (documentStore.currentDoc) {
        documentStore.doToggleFavorite(documentStore.currentDoc.meta.id)
      }
      return
    }

    if (isMod && event.key === 'w') {
      event.preventDefault()
      if (tabStore.activeTabId) tabStore.doCloseTab(tabStore.activeTabId)
      return
    }

    if (isMod && event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      const tabs = tabStore.tabOrder
      if (tabs.length === 0) return
      const currentIndex = tabs.findIndex(t => t.docId === tabStore.activeTabId)
      const nextIndex = (currentIndex + 1) % tabs.length
      const nextTab = tabs[nextIndex]
      tabStore.doSetActiveTab(nextTab.docId)
      documentStore.doLoadDocument(nextTab.docId)
      return
    }

    if (isMod && event.key === 'Tab' && event.shiftKey) {
      event.preventDefault()
      const tabs = tabStore.tabOrder
      if (tabs.length === 0) return
      const currentIndex = tabs.findIndex(t => t.docId === tabStore.activeTabId)
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      const prevTab = tabs[prevIndex]
      tabStore.doSetActiveTab(prevTab.docId)
      documentStore.doLoadDocument(prevTab.docId)
      return
    }

    if (isMod && event.key === '\\') {
      event.preventDefault()
      settingStore.doToggleSidebar()
      return
    }

    if (event.key === 'Escape' && searchStore.isOpen) {
      searchStore.doCloseSearch()
      return
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeyDown))
}
