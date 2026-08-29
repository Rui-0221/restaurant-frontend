<template>
  <div class="business-empty" role="status">
    <van-empty :description="description">
      <slot />
    </van-empty>
  </div>
</template>

<script setup>
defineProps({
  description: { type: String, default: '暂无内容' },
})
</script>

<style scoped>
.business-empty {
  margin: var(--space-3);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-lg);
  background: rgb(255 253 250 / 72%);
}

.business-empty :deep(.van-empty__description) {
  color: var(--text-sub);
}
</style>
