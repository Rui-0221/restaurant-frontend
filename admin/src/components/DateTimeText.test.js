import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DateTimeText from './DateTimeText.vue'

describe('DateTimeText', () => {
  it('renders a localized time element', () => {
    const wrapper = shallowMount(DateTimeText, {
      props: { value: '2026-08-24T12:34:56+08:00' },
    })

    expect(wrapper.get('time').attributes('datetime')).toContain('2026-08-24T04:34:56')
    expect(wrapper.text()).not.toContain('T')
  })

  it('renders a safe fallback for an invalid date', () => {
    const wrapper = shallowMount(DateTimeText, { props: { value: 'not-a-date' } })

    expect(wrapper.text()).toBe('-')
    expect(wrapper.get('time').attributes('datetime')).toBeUndefined()
  })
})
