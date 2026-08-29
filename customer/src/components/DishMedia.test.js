import { nextTick } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DishMedia from './DishMedia.vue'

describe('DishMedia', () => {
  it('renders a real lazy-loaded image with dimensions and alternative text', () => {
    const wrapper = shallowMount(DishMedia, {
      props: {
        name: '宫保鸡丁',
        image: 'https://example.test/dish.jpg',
        width: 320,
        height: 240,
      },
    })

    const image = wrapper.get('img')
    expect(image.attributes()).toMatchObject({
      src: 'https://example.test/dish.jpg',
      alt: '宫保鸡丁图片',
      width: '320',
      height: '240',
      loading: 'lazy',
      decoding: 'async',
    })
  })

  it('uses a meaningful placeholder when no image is available', () => {
    const wrapper = shallowMount(DishMedia, {
      props: { name: '鱼香肉丝', categoryId: 2 },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.dish-media').attributes('role')).toBe('img')
    expect(wrapper.get('.dish-media').attributes('aria-label')).toBe('鱼香肉丝暂无图片')
    expect(wrapper.get('.dish-media span').text()).toBe('鱼')
  })

  it('falls back after an image load error', async () => {
    const wrapper = shallowMount(DishMedia, {
      props: { name: '红烧肉', image: '/missing.jpg' },
    })

    await wrapper.get('img').trigger('error')
    await nextTick()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.dish-media span').text()).toBe('红')
  })
})
