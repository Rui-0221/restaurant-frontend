<template>
  <div
    class="dish-media"
    :style="{ '--dish-gradient': fallbackGradient }"
    :role="showImage ? undefined : 'img'"
    :aria-label="showImage ? undefined : `${name || '菜品'}暂无图片`"
  >
    <!-- eslint-disable vue/html-self-closing -->
    <img
      v-if="showImage"
      :src="image"
      :alt="`${name || '菜品'}图片`"
      :width="width"
      :height="height"
      loading="lazy"
      decoding="async"
      @error="imageFailed = true"
    />
    <!-- eslint-enable vue/html-self-closing -->
    <span v-else aria-hidden="true">{{ initial }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  image: { type: String, default: '' },
  categoryId: { type: [Number, String], default: 0 },
  width: { type: Number, default: 240 },
  height: { type: Number, default: 180 },
})

const gradients = [
  'linear-gradient(145deg, #ef8b69, #d84d31)',
  'linear-gradient(145deg, #f1c878, #ca832f)',
  'linear-gradient(145deg, #80b49b, #3e8265)',
  'linear-gradient(145deg, #91acd8, #5278b3)',
  'linear-gradient(145deg, #c69ecf, #87659a)',
  'linear-gradient(145deg, #d89b7f, #9e5d45)',
]

const imageFailed = ref(false)
const showImage = computed(() => Boolean(props.image) && !imageFailed.value)
const initial = computed(() => props.name.trim().charAt(0) || '味')
const fallbackGradient = computed(() => {
  const numericId = Number(props.categoryId)
  const index = Number.isFinite(numericId) ? Math.abs(Math.floor(numericId)) : 0
  return gradients[index % gradients.length]
})

watch(
  () => props.image,
  () => {
    imageFailed.value = false
  },
)
</script>

<style scoped>
.dish-media {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  overflow: hidden;
  background: var(--dish-gradient);
  font-size: 34px;
  font-weight: 800;
  place-items: center;
}

.dish-media span {
  position: relative;
  z-index: 1;
  display: grid;
  width: 56px;
  height: 56px;
  border: 1px solid rgb(255 255 255 / 72%);
  border-radius: var(--radius-md);
  background: rgb(255 253 250 / 90%);
  color: var(--text-main);
  place-items: center;
}

.dish-media::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgb(255 255 255 / 15%), transparent 45%);
  content: '';
  pointer-events: none;
}

.dish-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
