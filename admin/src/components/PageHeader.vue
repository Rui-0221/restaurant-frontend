<template>
  <header class="page-header">
    <div class="page-header-copy">
      <span class="page-eyebrow" translate="no">RESTAURANT OPERATIONS</span>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  padding: 4px 2px 0;
}

.page-header-copy {
  min-width: 0;
}

.page-eyebrow {
  color: var(--brand-dark);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.8px;
}

.page-header h1 {
  margin-top: 5px;
  color: var(--text-main);
  font-size: clamp(24px, 3vw, 30px);
  line-height: 1.25;
  letter-spacing: -0.5px;
}

.page-header p {
  margin: 8px 0 0;
  color: var(--text-sub);
  font-size: 14px;
}

.page-header-actions {
  flex: none;
}

@media (max-width: 768px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
    margin-bottom: 18px;
  }

  .page-header-actions :deep(.el-button) {
    min-height: var(--tap-target-min);
  }
}
</style>
