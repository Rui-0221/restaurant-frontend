<template>
  <time class="date-time-text" :datetime="dateTimeAttribute">{{ formatted }}</time>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: [String, Number, Date], default: '' },
})

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const parsedDate = computed(() => {
  if (!props.value) return null
  const value = props.value instanceof Date ? props.value : new Date(props.value)
  return Number.isNaN(value.getTime()) ? null : value
})

const dateTimeAttribute = computed(() => parsedDate.value?.toISOString() || undefined)
const formatted = computed(() => (parsedDate.value ? dateFormatter.format(parsedDate.value) : '-'))
</script>

<style scoped>
.date-time-text {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
