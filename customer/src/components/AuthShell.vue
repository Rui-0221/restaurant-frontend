<template>
  <main id="main-content" class="auth-page" tabindex="-1" aria-labelledby="auth-title">
    <header class="auth-hero">
      <div class="auth-glow glow-one" aria-hidden="true" />
      <div class="auth-glow glow-two" aria-hidden="true" />
      <div class="brand-lockup">
        <div class="brand-mark" aria-hidden="true">🍜</div>
        <div>
          <p class="brand-name" translate="no">有味餐厅</p>
          <p class="brand-slogan">每一桌，都值得认真对待</p>
        </div>
      </div>
      <h1 id="auth-title">{{ title }}</h1>
      <p class="auth-tip">{{ description }}</p>
    </header>
    <section class="auth-content" :aria-label="`${title}表单`">
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
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  padding-bottom: calc(var(--space-8) + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 90% 12%, rgb(229 77 46 / 10%), transparent 18rem), var(--bg-page);
}

.auth-hero {
  position: relative;
  min-height: 290px;
  overflow: hidden;
  padding: calc(42px + env(safe-area-inset-top)) var(--space-6) 84px;
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
  background:
    linear-gradient(145deg, rgb(255 255 255 / 13%), transparent 42%),
    linear-gradient(155deg, #c94b2f 0%, var(--brand-dark) 58%, #8f2918 100%);
  color: #fff;
}

.auth-glow {
  position: absolute;
  border-radius: 50%;
  background: rgb(255 255 255 / 10%);
  pointer-events: none;
}

.glow-one {
  top: -84px;
  right: -68px;
  width: 220px;
  height: 220px;
}

.glow-two {
  bottom: 34px;
  left: -42px;
  width: 120px;
  height: 120px;
}

.brand-lockup {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

.brand-mark {
  width: 54px;
  height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: var(--radius-lg);
  background: rgb(255 255 255 / 18%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 24%);
  font-size: 28px;
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
}

.brand-slogan {
  margin-top: 2px;
  font-size: 11px;
  letter-spacing: 1px;
  opacity: 0.78;
}

h1 {
  position: relative;
  margin-top: var(--space-8);
  font-size: clamp(26px, 7vw, 32px);
  letter-spacing: 1px;
  text-align: center;
  text-wrap: balance;
}

.auth-tip {
  position: relative;
  max-width: 28rem;
  margin-top: var(--space-2);
  margin-inline: auto;
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.9;
  text-align: center;
  text-wrap: pretty;
}

.auth-content {
  position: relative;
  z-index: 1;
  width: min(calc(100% - 32px), 440px);
  margin: -46px auto 0;
  padding: var(--space-6) 0 var(--space-8);
  border: 1px solid rgb(233 224 216 / 76%);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-floating);
}

@media (max-width: 480px) {
  .auth-hero {
    min-height: 224px;
    padding: calc(24px + env(safe-area-inset-top)) 20px 64px;
  }

  h1 {
    margin-top: 16px;
  }

  .auth-content {
    padding-block: 20px 24px;
  }
}

@media (min-width: 640px) {
  .auth-page {
    display: grid;
    align-content: center;
    padding-block: 32px;
  }

  .auth-hero {
    width: min(calc(100% - 48px), 560px);
    margin-inline: auto;
    border-radius: var(--radius-xl);
  }
}
</style>
