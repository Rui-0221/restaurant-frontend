<template>
  <main class="auth-page">
    <header class="auth-hero">
      <div class="brand-mark" aria-hidden="true">🍜</div>
      <p class="brand-name">有味餐厅</p>
      <h1>{{ title }}</h1>
      <p class="auth-tip">{{ description }}</p>
    </header>
    <section class="auth-content">
      <slot />
    </section>
  </main>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: var(--bg-page);
}

.auth-hero {
  padding: 48px var(--space-6) 72px;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  background: linear-gradient(150deg, #f48c68, var(--brand-color));
  color: #fff;
  text-align: center;
}

.brand-mark {
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: var(--radius-lg);
  background: rgb(255 255 255 / 16%);
  font-size: 28px;
}

.brand-name {
  margin-top: var(--space-3);
  font-size: 13px;
  letter-spacing: 3px;
  opacity: 0.88;
}

h1 {
  margin-top: var(--space-2);
  font-size: 24px;
  letter-spacing: 1px;
}

.auth-tip {
  margin-top: var(--space-2);
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.9;
}

.auth-content {
  margin: calc(-1 * var(--space-5)) var(--space-4) 0;
  padding: var(--space-6) 0 var(--space-8);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-floating);
}
</style>
