<template>
  <div class="loading-skeleton" role="status" aria-live="polite">
    <span class="sr-only">正在加载</span>
    <van-skeleton v-for="row in rowCount" :key="row" title :row="2" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  count: { type: Number, default: 1 },
})

const rowCount = computed(() => Math.max(1, Math.floor(props.count) || 0))
</script>

<style scoped>
.loading-skeleton {
  display: grid;
  gap: var(--space-3);
  margin: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface);
}
</style>
