<script setup lang="ts">
import { useSettingStore } from '@/stores/settingStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import TabBar from '@/components/layout/TabBar.vue'
import TocPanel from '@/components/viewer/TocPanel.vue'
import StatusBar from '@/components/layout/StatusBar.vue'

const settingStore = useSettingStore()
</script>

<template>
  <div
    class="grid h-screen w-screen overflow-hidden"
    style="grid-template-columns: 240px 1fr 220px; grid-template-rows: 48px 1fr 24px;"
  >
    <AppHeader class="col-span-3" />
    <Sidebar v-show="!settingStore.sidebarCollapsed" />
    <div class="flex flex-col overflow-hidden" style="background-color: var(--bg);">
      <TabBar />
      <main class="flex-1 overflow-hidden">
        <slot />
      </main>
    </div>
    <TocPanel />
    <StatusBar class="col-span-3" />
  </div>
</template>
