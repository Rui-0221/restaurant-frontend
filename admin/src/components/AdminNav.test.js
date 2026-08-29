import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import AdminNav from './AdminNav.vue'
import { useAuthStore } from '../store/auth'

const ElMenuStub = {
  props: ['defaultActive', 'collapse'],
  emits: ['select'],
  template:
    '<button class="menu-stub" :data-active="defaultActive" :data-collapsed="String(collapse)" @click="$emit(\'select\', \'/orders\')"><slot /></button>',
}

describe('AdminNav', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders a labelled navigation landmark and exposes its public props and event', async () => {
    const wrapper = shallowMount(AdminNav, {
      props: { activeMenu: '/orders', collapsed: true },
      global: {
        stubs: {
          ElMenu: ElMenuStub,
          ElMenuItem: { template: '<div class="menu-item-stub"><slot /></div>' },
          ElIcon: { template: '<span><slot /></span>' },
        },
      },
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('主导航')
    expect(wrapper.get('.menu-stub').attributes('data-active')).toBe('/orders')
    expect(wrapper.get('.menu-stub').attributes('data-collapsed')).toBe('true')
    expect(wrapper.get('.brand-copy strong').attributes('translate')).toBe('no')

    await wrapper.get('.menu-stub').trigger('click')
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })

  it('makes each navigation item keyboard focusable and activates it with Enter', async () => {
    const wrapper = shallowMount(AdminNav, {
      global: {
        stubs: {
          ElMenu: ElMenuStub,
          ElMenuItem: { template: '<div class="menu-item-stub"><slot /></div>' },
          ElIcon: { template: '<span><slot /></span>' },
        },
      },
    })

    const items = wrapper.findAll('.menu-item-stub')

    expect(items.length).toBeGreaterThan(0)
    expect(items.every((item) => item.attributes('tabindex') === '0')).toBe(true)

    await items[0].trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })

  it('只向管理员显示 AI 菜品手册入口', () => {
    const auth = useAuthStore()
    auth.role = 1
    const adminWrapper = shallowMount(AdminNav, {
      global: {
        stubs: {
          ElMenu: ElMenuStub,
          ElMenuItem: { template: '<div class="menu-item-stub"><slot /></div>' },
          ElIcon: { template: '<span><slot /></span>' },
        },
      },
    })
    expect(adminWrapper.text()).toContain('AI 菜品手册')

    auth.role = 2
    const waiterWrapper = shallowMount(AdminNav, {
      global: {
        stubs: {
          ElMenu: ElMenuStub,
          ElMenuItem: { template: '<div class="menu-item-stub"><slot /></div>' },
          ElIcon: { template: '<span><slot /></span>' },
        },
      },
    })
    expect(waiterWrapper.text()).not.toContain('AI 菜品手册')
  })
})
