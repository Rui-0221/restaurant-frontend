import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MoneyValue from './MoneyValue.vue'

describe('MoneyValue', () => {
  it('formats a CNY amount with grouping and two decimals', () => {
    const wrapper = shallowMount(MoneyValue, { props: { amount: '1234.5' } })

    expect(wrapper.text()).toContain('1,234.50')
  })

  it('falls back to zero for invalid amounts', () => {
    const wrapper = shallowMount(MoneyValue, { props: { amount: 'invalid' } })

    expect(wrapper.text()).toContain('0.00')
  })
})
