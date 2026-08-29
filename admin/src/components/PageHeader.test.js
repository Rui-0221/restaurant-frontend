import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageHeader from './PageHeader.vue'

describe('PageHeader', () => {
  it('renders title, optional subtitle, and actions slot', () => {
    const wrapper = mount(PageHeader, {
      props: { title: '订单管理', subtitle: '查看订单明细' },
      slots: { actions: '<button>刷新</button>' },
    })

    expect(wrapper.find('h1').text()).toBe('订单管理')
    expect(wrapper.find('p').text()).toBe('查看订单明细')
    expect(wrapper.find('button').text()).toBe('刷新')
  })

  it('does not render an empty subtitle', () => {
    const wrapper = mount(PageHeader, { props: { title: '工作台' } })

    expect(wrapper.find('p').exists()).toBe(false)
  })
})
