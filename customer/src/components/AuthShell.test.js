import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuthShell from './AuthShell.vue'

describe('AuthShell', () => {
  it('exposes a focusable main landmark and renders its public content slots', () => {
    const wrapper = shallowMount(AuthShell, {
      props: { title: '登录点餐', description: '登录后继续点餐' },
      slots: { default: '<form aria-label="登录表单"></form>' },
    })

    const main = wrapper.get('main')
    expect(main.attributes('id')).toBe('main-content')
    expect(main.attributes('tabindex')).toBe('-1')
    expect(wrapper.get('h1').text()).toBe('登录点餐')
    expect(wrapper.text()).toContain('登录后继续点餐')
    expect(wrapper.get('form').attributes('aria-label')).toBe('登录表单')
  })
})
