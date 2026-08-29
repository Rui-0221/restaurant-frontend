<template>
  <span class="money-text">
    <span v-if="label" class="money-label">{{ label }}</span>
    <span>{{ formattedAmount }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  amount: { type: [Number, String], default: 0 },
  estimated: { type: Boolean, default: false },
  confirmed: { type: Boolean, default: false },
})

const label = computed(() => {
  if (props.confirmed) return '已确认金额：'
  if (props.estimated) return '预估金额：'
  return ''
})

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const formattedAmount = computed(() => {
  const amount = Number(props.amount)
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0)
})
</script>

<style scoped>
.money-text {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.money-label {
  color: var(--text-sub);
  font-size: 0.72em;
  font-weight: 500;
}
</style>
