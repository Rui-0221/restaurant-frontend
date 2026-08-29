<template>
  <van-nav-bar :title="title">
    <template #left>
      <button type="button" class="nav-back" :aria-label="backLabel" @click="$emit('back')">
        <span aria-hidden="true">←</span>
      </button>
    </template>
    <template v-if="$slots.right" #right>
      <slot name="right" />
    </template>
  </van-nav-bar>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  backLabel: { type: String, default: '返回上一页' },
})

defineEmits(['back'])
</script>

<style scoped>
.nav-back {
  display: inline-grid;
  width: var(--tap-target-min);
  height: var(--tap-target-min);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  font: inherit;
  font-size: 22px;
  place-items: center;
}

.nav-back:hover {
  background: var(--brand-light);
  color: var(--brand-dark);
}
</style>
