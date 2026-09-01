<script setup lang="ts">
import { ref } from 'vue'
import { useSettingStore } from '@/stores/settingStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import StatusBar from '@/components/layout/StatusBar.vue'

const settingStore = useSettingStore()

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 400

const sidebarWidth = ref(settingStore.sidebarWidth)
const dragging = ref(false)

function onDragStart() {
  dragging.value = true
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onDragMove(e: MouseEvent) {
  if (!dragging.value) return
  const w = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX))
  sidebarWidth.value = w
  settingStore.doSetSidebarWidth(w)
}

function onDragEnd() {
  dragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}
</script>

<template>
  <div
    class="h-screen w-screen flex flex-col overflow-hidden bg-bg"
    @mousemove="onDragMove"
    @mouseup="onDragEnd"
    @mouseleave="onDragEnd"
  >
    <!-- Top header bar -->
    <AppHeader />

    <!-- Three-column body -->
    <div class="flex flex-1 overflow-hidden border-t border-border">
      <!-- Left: Navigation sidebar -->
      <Sidebar
        class="shrink-0 overflow-hidden transition-[width] duration-150 ease-out"
        :style="{ width: (settingStore.sidebarCollapsed ? 52 : sidebarWidth) + 'px' }"
      />

      <!-- Sidebar resize handle -->
      <div
        v-show="!settingStore.sidebarCollapsed"
        class="shrink-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
        @mousedown="onDragStart"
      />

      <!-- Right: Content viewer -->
      <main class="relative flex-1 min-w-0 overflow-hidden">
        <slot />
      </main>
    </div>

    <!-- Bottom status bar -->
    <StatusBar />
  </div>
</template>
