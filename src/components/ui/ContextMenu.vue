<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

interface MenuItem {
  key: string
  label: string
  danger?: boolean
  action: () => void
}

const props = defineProps<{
  x: number
  y: number
  items: MenuItem[]
}>()

const emit = defineEmits<{ close: [] }>()

const menuRef = ref<HTMLElement | null>(null)
const pos = ref({ left: props.x, top: props.y })

function close() { emit('close') }

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) close()
}
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}
function onViewportChange() { close() }

onMounted(() => {
  const el = menuRef.value
  if (el) {
    const rect = el.getBoundingClientRect()
    let left = props.x
    let top = props.y
    if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 4
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 4
    pos.value = { left: Math.max(4, left), top: Math.max(4, top) }
  }
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('blur', onViewportChange)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('blur', onViewportChange)
  window.removeEventListener('resize', onViewportChange)
})

function handleItem(item: MenuItem) {
  item.action()
  close()
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="menuRef"
      class="fixed z-50 min-w-40 rounded-md border border-border bg-surface py-1 shadow-xl select-none"
      :style="{ left: pos.left + 'px', top: pos.top + 'px' }"
    >
      <button
        v-for="item in items"
        :key="item.key"
        class="flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-hover"
        :class="item.danger ? 'text-red-500' : 'text-text'"
        @click="handleItem(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>
