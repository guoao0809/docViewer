<script setup lang="ts">
import { computed } from 'vue'
import { useKeyboard } from '@/composables/useKeyboard'
import MainLayout from '@/layouts/MainLayout.vue'
import SearchOverlay from '@/components/search/SearchOverlay.vue'
import MarkdownViewer from '@/components/viewer/MarkdownViewer.vue'
import WelcomePage from '@/pages/WelcomePage.vue'
import { useDocumentStore } from '@/stores/documentStore'

useKeyboard()

const documentStore = useDocumentStore()
const showWelcome = computed(() => documentStore.rootPaths.length === 0)
</script>

<template>
  <MainLayout>
    <WelcomePage v-if="showWelcome" />
    <MarkdownViewer v-else />
  </MainLayout>
  <SearchOverlay />
</template>