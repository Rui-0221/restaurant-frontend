<template>
  <span class="money-value">{{ formatted }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  amount: { type: [Number, String], default: 0 },
})

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formatted = computed(() => {
  const value = Number(props.amount)
  return moneyFormatter.format(Number.isFinite(value) ? value : 0)
})
</script>

<style scoped>
.money-value {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
