<script setup lang="ts">
import { ref } from 'vue'
import {
  DialogRoot,
  DialogContent,
  DialogPortal,
  DialogClose,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import { Button } from './button'

defineProps<{
  open: boolean
  title: string
  description: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const skipNext = ref(false)

function handleConfirm() {
  if (skipNext.value) {
    localStorage.setItem('docviewer-skip-remove-confirm', 'true')
  }
  emit('confirm')
}
</script>

<template>
  <DialogRoot :open="open" @update:open="!$event && emit('cancel')">
    <DialogPortal>
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-surface rounded-lg shadow-2xl p-6"
      >
        <DialogClose
          class="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          @click="emit('cancel')"
        >
          <X class="w-4 h-4 text-text" />
        </DialogClose>

        <div class="flex flex-col gap-y-1.5 mb-4">
          <h2 class="text-lg font-semibold leading-none tracking-tight text-title">{{ title }}</h2>
          <p class="text-sm text-text">{{ description }}</p>
        </div>

        <div class="flex items-center gap-2 py-1 mb-4">
          <input
            id="skip-confirm"
            v-model="skipNext"
            type="checkbox"
            class="w-4 h-4 rounded border-border text-primary accent-primary"
          />
          <label for="skip-confirm" class="text-sm text-text/60 cursor-pointer">
            下次不再询问
          </label>
        </div>

        <div class="flex justify-end gap-x-2">
          <Button variant="outline" @click="emit('cancel')">取消</Button>
          <Button class="bg-red-500 text-white hover:bg-red-600" @click="handleConfirm">确定</Button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
