import { describe, expect, it } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { Stepper } from 'vant'
import QuantityControl from './QuantityControl.vue'

const mountControl = (props = {}) =>
  shallowMount(QuantityControl, {
    props: { modelValue: 1, ...props },
    global: {
      stubs: {
        'van-stepper': {
          name: 'van-stepper',
          props: ['modelValue', 'min', 'max', 'disabled'],
          template: '<button @click="$emit(\'update:modelValue\', 2)">stepper</button>',
        },
      },
    },
  })

describe('QuantityControl', () => {
  it('gives every quantity control an accessible name and a 44px input target', async () => {
    const wrapper = mount(QuantityControl, {
      props: {
        modelValue: 1,
        ariaLabel: '鱼香肉丝数量',
        name: 'dish-1-quantity',
      },
      global: { components: { VanStepper: Stepper } },
    })

    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('button')
    const input = wrapper.get('input')

    expect(buttons[0].attributes('aria-label')).toBe('减少鱼香肉丝数量')
    expect(input.attributes('aria-label')).toBe('鱼香肉丝数量')
    expect(input.attributes('name')).toBe('dish-1-quantity')
    expect(input.attributes('inputmode')).toBe('numeric')
    expect(input.element.style.width).toBe('44px')
    expect(buttons[1].attributes('aria-label')).toBe('增加鱼香肉丝数量')
  })

  it('passes the default 0–99 boundary and disabled state to the stepper', () => {
    const wrapper = mountControl({ modelValue: 0, disabled: true })
    const stepper = wrapper.findComponent({ name: 'van-stepper' })

    expect(stepper.props('min')).toBe(0)
    expect(stepper.props('max')).toBe(99)
    expect(stepper.props('disabled')).toBe(true)
  })

  it('forwards valid quantity changes', async () => {
    const wrapper = mountControl()

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  })

  it('emits an invalid event for values outside the configured range', async () => {
    const wrapper = mountControl({ min: 1, max: 3 })
    const stepper = wrapper.findComponent({ name: 'van-stepper' })

    stepper.vm.$emit('update:modelValue', 4)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('invalid')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
