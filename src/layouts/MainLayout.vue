<script setup lang="ts">
import { computed } from 'vue'
import { useSettingStore } from '@/stores/settingStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import TabBar from '@/components/layout/TabBar.vue'
import TocPanel from '@/components/viewer/TocPanel.vue'
import StatusBar from '@/components/layout/StatusBar.vue'

const settingStore = useSettingStore()

const sidebarW = computed(() => settingStore.sidebarCollapsed ? '0px' : `${settingStore.sidebarWidth}px`)
const tocW = computed(() => `${settingStore.tocPanelWidth}px`)
const gridCols = computed(() => `${sidebarW.value} 1fr ${tocW.value}`)
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden" style="background-color: var(--bg);">
    <!-- 顶部工具栏 — 占满宽度 -->
    <AppHeader />

    <!-- 中间内容区 — 三栏 -->
    <div class="flex flex-1 overflow-hidden" style="border-top: 1px solid var(--border);">
      <!-- 左侧导航栏 -->
      <Sidebar v-show="!settingStore.sidebarCollapsed" class="shrink-0 overflow-hidden" :style="{ width: settingStore.sidebarWidth + 'px' }" />

      <!-- 中间阅读区 -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden" style="background-color: var(--bg);">
        <TabBar />
        <main class="flex-1 overflow-hidden">
          <slot />
        </main>
      </div>

      <!-- 右侧 TOC 面板 -->
      <TocPanel class="shrink-0 overflow-hidden" :style="{ width: settingStore.tocPanelWidth + 'px' }" />
    </div>

    <!-- 底部状态栏 — 占满宽度 -->
    <StatusBar />
  </div>
</template>