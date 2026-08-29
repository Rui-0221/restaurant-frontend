import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import LoadingSkeleton from './LoadingSkeleton.vue'

describe('LoadingSkeleton', () => {
  it('renders the requested number of skeleton rows', () => {
    const wrapper = shallowMount(LoadingSkeleton, {
      props: { count: 2 },
      global: { stubs: { 'van-skeleton': { template: '<div class="skeleton" />' } } },
    })

    expect(wrapper.findAll('.skeleton')).toHaveLength(2)
  })

  it('renders at least one row for an invalid count', () => {
    const wrapper = shallowMount(LoadingSkeleton, {
      props: { count: 0 },
      global: { stubs: { 'van-skeleton': { template: '<div class="skeleton" />' } } },
    })

    expect(wrapper.findAll('.skeleton')).toHaveLength(1)
  })
})
