<script setup lang="ts">
import { useSettingStore } from '@/stores/settingStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import DocumentList from '@/components/layout/DocumentList.vue'
import StatusBar from '@/components/layout/StatusBar.vue'

const settingStore = useSettingStore()
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-bg">
    <!-- Top header bar -->
    <AppHeader />

    <!-- Three-column body -->
    <div class="flex flex-1 overflow-hidden border-t border-border">
      <!-- Left: Navigation sidebar -->
      <Sidebar
        v-show="!settingStore.sidebarCollapsed"
        class="shrink-0 overflow-hidden"
        :style="{ width: settingStore.sidebarWidth + 'px' }"
      />

      <!-- Middle: Document list -->
      <DocumentList class="shrink-0 overflow-hidden" style="width: 320px;" />

      <!-- Right: Content viewer -->
      <main class="flex-1 min-w-0 overflow-hidden">
        <slot />
      </main>
    </div>

    <!-- Bottom status bar -->
    <StatusBar />
  </div>
</template>
