import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import BusinessEmpty from './BusinessEmpty.vue'

describe('BusinessEmpty', () => {
  it('passes the business description and preserves the action slot', () => {
    const wrapper = shallowMount(BusinessEmpty, {
      props: { description: '请先扫码进入点餐' },
      slots: { default: '<button>去扫码</button>' },
      global: {
        stubs: {
          'van-empty': {
            props: ['description'],
            template: '<div><span class="description">{{ description }}</span><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('请先扫码进入点餐')
    expect(wrapper.text()).toContain('去扫码')
  })

  it('uses an explicit fallback description when none is supplied', () => {
    const wrapper = shallowMount(BusinessEmpty, {
      global: {
        stubs: {
          'van-empty': { props: ['description'], template: '<div>{{ description }}</div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('暂无内容')
  })
})
