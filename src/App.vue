<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useKeyboard } from '@/composables/useKeyboard'
import { useLauncher } from '@/composables/useLauncher'
import MainLayout from '@/layouts/MainLayout.vue'
import SearchOverlay from '@/components/search/SearchOverlay.vue'
import ContentViewer from '@/components/viewer/ContentViewer.vue'
import LauncherPage from '@/pages/LauncherPage.vue'

useKeyboard()

const { currentLabel } = useLauncher()
const ready = ref(false)

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <!-- 小窗模式 -->
  <LauncherPage v-if="ready && currentLabel === 'launcher'" />

  <!-- 主窗口模式 -->
  <template v-else-if="ready">
    <MainLayout>
      <ContentViewer />
    </MainLayout>
    <SearchOverlay />
  </template>

  <!-- 加载中占位 -->
  <div v-else class="h-screen w-screen bg-bg" />
</template>
