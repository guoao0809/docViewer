<script setup lang="ts">
import { ref } from 'vue'
import { useSettingStore } from '@/stores/settingStore'
import AppHeader from '@/components/layout/AppHeader.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import DocumentList from '@/components/layout/DocumentList.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import { PanelLeftOpen } from 'lucide-vue-next'

const settingStore = useSettingStore()
const activeNav = ref('all')

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 400
const DOCLIST_MIN = 280
const DOCLIST_MAX = 500

const sidebarWidth = ref(settingStore.sidebarWidth)
const docListWidth = ref(320)
const dragging = ref<'sidebar' | 'doclist' | null>(null)

function handleNavChange(key: string) {
  activeNav.value = key
}

function onDragStart(type: 'sidebar' | 'doclist') {
  dragging.value = type
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onDragMove(e: MouseEvent) {
  if (!dragging.value) return
  if (dragging.value === 'sidebar') {
    const w = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX))
    sidebarWidth.value = w
    settingStore.doSetSidebarWidth(w)
  } else {
    const w = Math.max(DOCLIST_MIN, Math.min(DOCLIST_MAX, e.clientX - sidebarWidth.value))
    docListWidth.value = w
  }
}

function onDragEnd() {
  dragging.value = null
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
        :active-nav="activeNav"
        @nav-change="handleNavChange"
      />

      <!-- Sidebar resize handle -->
      <div
        v-show="!settingStore.sidebarCollapsed"
        class="shrink-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
        @mousedown="onDragStart('sidebar')"
      />

      <!-- Middle: Document list -->
      <DocumentList
        v-if="!settingStore.docListCollapsed"
        class="shrink-0 overflow-hidden"
        :style="{ width: docListWidth + 'px' }"
        :active-nav="activeNav"
      />

      <!-- DocList resize handle -->
      <div
        v-show="!settingStore.docListCollapsed"
        class="shrink-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-10"
        @mousedown="onDragStart('doclist')"
      />

      <!-- Right: Content viewer -->
      <main class="relative flex-1 min-w-0 overflow-hidden">
        <slot />
        <!-- 文档列表收起时：底部悬浮的展开按钮 -->
        <button
          v-if="settingStore.docListCollapsed"
          class="absolute bottom-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary/90"
          title="展开文档列表"
          @click="settingStore.doToggleDocList()"
        >
          <PanelLeftOpen class="h-5 w-5" />
        </button>
      </main>
    </div>

    <!-- Bottom status bar -->
    <StatusBar />
  </div>
</template>
