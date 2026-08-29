import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StatusTag from './StatusTag.vue'

describe('StatusTag', () => {
  it('uses the shared order status label and tag type', () => {
    const wrapper = mount(StatusTag, { props: { status: 2 } })

    expect(wrapper.find('el-tag').attributes('type')).toBe('primary')
    expect(wrapper.find('el-tag').text()).toBe('制作中')
  })

  it('renders a safe fallback for an unknown status', () => {
    const wrapper = mount(StatusTag, { props: { status: 99 } })

    expect(wrapper.find('el-tag').attributes('type')).toBe('info')
    expect(wrapper.find('el-tag').text()).toBe('未知状态')
  })
})
