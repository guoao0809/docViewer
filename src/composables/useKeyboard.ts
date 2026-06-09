import { onMounted, onUnmounted } from 'vue'
import { useSearchStore } from '@/stores/searchStore'
import { useDocumentStore } from '@/stores/documentStore'
import { useSettingStore } from '@/stores/settingStore'

export function useKeyboard() {
  const searchStore = useSearchStore()
  const documentStore = useDocumentStore()
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
      if (documentStore.activeDocId) {
        documentStore.doRemoveOpenedDoc(documentStore.activeDocId)
      }
      return
    }

    if (isMod && event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      const docs = documentStore.openedDocs
      if (docs.length === 0) return
      const currentIndex = docs.findIndex(d => d.id === documentStore.activeDocId)
      const nextIndex = (currentIndex + 1) % docs.length
      documentStore.doOpenDoc(docs[nextIndex])
      return
    }

    if (isMod && event.key === 'Tab' && event.shiftKey) {
      event.preventDefault()
      const docs = documentStore.openedDocs
      if (docs.length === 0) return
      const currentIndex = docs.findIndex(d => d.id === documentStore.activeDocId)
      const prevIndex = (currentIndex - 1 + docs.length) % docs.length
      documentStore.doOpenDoc(docs[prevIndex])
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
