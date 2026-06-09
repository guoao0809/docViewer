<script setup lang="ts">
import { useKeyboard } from '@/composables/useKeyboard'
import MainLayout from '@/layouts/MainLayout.vue'
import SearchOverlay from '@/components/search/SearchOverlay.vue'
import ContentViewer from '@/components/viewer/ContentViewer.vue'

useKeyboard()
</script>

<template>
  <MainLayout>
    <ContentViewer />
  </MainLayout>
  <SearchOverlay />
</template>
