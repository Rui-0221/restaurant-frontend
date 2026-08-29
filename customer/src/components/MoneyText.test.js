import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import MoneyText from './MoneyText.vue'

describe('MoneyText', () => {
  it('labels estimated amounts and formats them to two decimals', () => {
    const wrapper = shallowMount(MoneyText, { props: { amount: 10, estimated: true } })

    expect(wrapper.text()).toContain('预估金额')
    expect(wrapper.text()).toContain('¥10.00')
  })

  it('labels confirmed amounts distinctly', () => {
    const wrapper = shallowMount(MoneyText, { props: { amount: '12.5', confirmed: true } })

    expect(wrapper.text()).toContain('已确认金额')
    expect(wrapper.text()).toContain('¥12.50')
    expect(wrapper.text()).not.toContain('预估金额')
  })

  it('does not invent a label for a plain unit price and handles invalid values safely', () => {
    const wrapper = shallowMount(MoneyText, { props: { amount: 'not-a-number' } })

    expect(wrapper.text()).toBe('¥0.00')
    expect(wrapper.find('.money-label').exists()).toBe(false)
  })

  it('places the currency sign according to the Chinese locale for negative amounts', () => {
    const wrapper = shallowMount(MoneyText, { props: { amount: -1.5 } })

    expect(wrapper.text()).toBe('-¥1.50')
  })
})
