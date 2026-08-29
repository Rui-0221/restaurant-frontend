import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CustomerNavBar from './CustomerNavBar.vue'

const NavBarStub = {
  props: ['title'],
  template:
    '<header><span class="nav-title">{{ title }}</span><slot name="left" /><slot name="right" /></header>',
}

describe('CustomerNavBar', () => {
  it('renders a labelled native back button and preserves the right slot', async () => {
    const wrapper = shallowMount(CustomerNavBar, {
      props: { title: '确认菜品', backLabel: '返回菜单' },
      slots: { right: '<button class="right-action">刷新</button>' },
      global: { stubs: { VanNavBar: NavBarStub } },
    })

    expect(wrapper.get('.nav-title').text()).toBe('确认菜品')
    expect(wrapper.get('.nav-back').attributes('aria-label')).toBe('返回菜单')
    expect(wrapper.get('.right-action').text()).toBe('刷新')

    await wrapper.get('.nav-back').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })
})
