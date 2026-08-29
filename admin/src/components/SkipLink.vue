<template>
  <a class="skip-link" :href="`#${targetId}`" @click.prevent="moveFocus">{{ label }}</a>
</template>

<script setup>
const props = defineProps({
  targetId: { type: String, default: 'main-content' },
  label: { type: String, default: '跳至主要内容' },
})

const moveFocus = () => {
  const target = document.getElementById(props.targetId)
  if (!target) return

  target.focus()
  target.scrollIntoView?.({ block: 'start' })
}
</script>
