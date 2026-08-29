<template>
  <el-tag
    :type="statusMeta.type"
    :effect="effect"
    :size="size"
    :aria-label="`订单状态：${statusMeta.label}`"
    round
  >
    {{ statusMeta.label }}
  </el-tag>
</template>

<script setup>
import { computed } from 'vue'
import { ORDER_STATUS } from '../utils/constants'

const props = defineProps({
  status: { type: [Number, String], required: true },
  effect: { type: String, default: 'light' },
  size: { type: String, default: undefined },
})

const statusMeta = computed(() => ORDER_STATUS[props.status] || { label: '未知状态', type: 'info' })
</script>
