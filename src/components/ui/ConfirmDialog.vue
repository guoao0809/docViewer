<script setup lang="ts">
import { ref } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { Button } from './button'

const props = defineProps<{
  open: boolean
  title: string
  description: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
  'update:open': [value: boolean]
}>()

const skipNext = ref(false)

function handleConfirm() {
  if (skipNext.value) {
    localStorage.setItem('docviewer-skip-remove-confirm', 'true')
  }
  emit('confirm')
}

function handleCancel() {
  skipNext.value = false
  emit('cancel')
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <div class="flex items-center gap-2 py-1">
        <input
          id="skip-confirm"
          v-model="skipNext"
          type="checkbox"
          class="w-4 h-4 rounded border-border text-primary"
        />
        <label for="skip-confirm" class="text-sm text-text/60 cursor-pointer">
          下次不再询问
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="handleCancel">取消</Button>
        <Button class="bg-red-500 text-white hover:bg-red-600" @click="handleConfirm">确定</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
