import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SkipLink from './SkipLink.vue'

describe('SkipLink', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves focus to the configured target without relying on the route hash', async () => {
    const target = document.createElement('main')
    target.id = 'main-content'
    target.tabIndex = -1
    target.scrollIntoView = vi.fn()
    document.body.append(target)

    const wrapper = mount(SkipLink, { attachTo: document.body })
    await wrapper.get('a').trigger('click')

    expect(document.activeElement).toBe(target)
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('supports a custom target and label', () => {
    const wrapper = mount(SkipLink, {
      props: { targetId: 'login-form', label: '跳至登录表单' },
    })

    expect(wrapper.get('a').attributes('href')).toBe('#login-form')
    expect(wrapper.text()).toBe('跳至登录表单')
  })
})
