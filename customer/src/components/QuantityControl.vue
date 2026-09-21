<template>
  <van-stepper
    ref="stepperRef"
    class="quantity-control"
    :model-value="modelValue"
    :min="min"
    :max="max"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :input-width="44"
    :button-size="44"
    integer
    @update:model-value="handleUpdate"
  />
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 99 },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '菜品数量' },
  name: { type: String, default: 'quantity' },
})

const emit = defineEmits(['update:modelValue', 'invalid'])
const stepperRef = ref(null)

const applyAccessibleNames = () => {
  const root = stepperRef.value?.$el
  root?.querySelector('.van-stepper__minus')?.setAttribute('aria-label', `减少${props.ariaLabel}`)
  root?.querySelector('.van-stepper__plus')?.setAttribute('aria-label', `增加${props.ariaLabel}`)

  const input = root?.querySelector('.van-stepper__input')
  input?.setAttribute('aria-label', props.ariaLabel)
  input?.setAttribute('name', props.name)
}

onMounted(applyAccessibleNames)
watch(() => [props.ariaLabel, props.name], applyAccessibleNames)

const handleUpdate = (value) => {
  const next = Number(value)
  if (!Number.isInteger(next) || next < props.min || next > props.max) {
    emit('invalid', { value, message: `数量必须在 ${props.min}～${props.max} 之间` })
    return
  }
  emit('update:modelValue', next)
}
</script>

<style scoped>
.quantity-control {
  flex-shrink: 0;
  white-space: nowrap;
}

:deep(.van-stepper__minus),
:deep(.van-stepper__plus) {
  width: var(--tap-target-min);
  height: var(--tap-target-min);
  border-radius: var(--radius-md);
  background: var(--brand-light);
}

:deep(.van-stepper__input) {
  width: var(--tap-target-min);
  height: var(--tap-target-min);
  margin-inline: 3px;
  border-radius: var(--radius-sm);
  background: #fbf8f5;
  color: var(--text-main);
  font-weight: 700;
}

:deep(.van-stepper__minus::before),
:deep(.van-stepper__minus::after),
:deep(.van-stepper__plus::before),
:deep(.van-stepper__plus::after) {
  background: var(--brand-color);
}
</style>
