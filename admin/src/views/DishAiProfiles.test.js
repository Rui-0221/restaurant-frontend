import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DishAiProfiles from './DishAiProfiles.vue'

const mocks = vi.hoisted(() => ({
  getDishes: vi.fn(),
  getProfiles: vi.fn(),
  saveProfile: vi.fn(),
}))

vi.mock('../api/modules', () => ({ getDishes: mocks.getDishes }))
vi.mock('../api/dishAiProfiles', () => ({
  getDishAiProfiles: mocks.getProfiles,
  saveDishAiProfile: mocks.saveProfile,
}))

const dishes = [
  { id: 1, name: '水煮牛肉', status: 1 },
  { id: 2, name: '清炒时蔬', status: 1 },
]

const verifiedProfile = {
  dishId: 1,
  cuisine: '川菜',
  tasteTags: '麻辣,鲜香',
  spicyLevel: 4,
  ingredients: '牛肉,辣椒',
  allergens: 'NONE',
  dietaryTags: '',
  isSignature: true,
  signatureRank: 1,
  recommendationNotes: '适合喜欢麻辣口味的顾客',
  servingPeople: 2,
  profileStatus: 'VERIFIED',
}

const mountPage = () =>
  shallowMount(DishAiProfiles, {
    global: {
      stubs: {
        PageHeader: { template: '<header><slot /><slot name="actions" /></header>' },
        ElDrawer: {
          props: ['modelValue'],
          template:
            '<section v-if="modelValue" class="drawer-stub"><slot /><slot name="footer" /></section>',
        },
      },
    },
  })

describe('AI 菜品手册页', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mocks.getDishes.mockResolvedValue(dishes)
    mocks.getProfiles.mockResolvedValue([verifiedProfile])
    mocks.saveProfile.mockResolvedValue('保存成功')
  })

  it('合并菜品与手册资料并明确显示未配置菜品', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('水煮牛肉')
    expect(wrapper.text()).toContain('已验证')
    expect(wrapper.text()).toContain('清炒时蔬')
    expect(wrapper.text()).toContain('未配置')
  })

  it('拒绝把缺少明确过敏原的资料标记为已验证', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('[data-testid="edit-profile-1"]').trigger('click')
    await wrapper.get('input[name="allergens"]').setValue('')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="alert"]').text()).toContain('过敏原')
    expect(mocks.saveProfile).not.toHaveBeenCalled()
  })

  it('保存完整资料后重新读取手册', async () => {
    const wrapper = mountPage()
    await flushPromises()
    await wrapper.get('[data-testid="edit-profile-1"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.saveProfile).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        cuisine: '川菜',
        allergens: 'NONE',
        isSignature: true,
        signatureRank: 1,
        profileStatus: 'VERIFIED',
      }),
    )
    expect(mocks.getProfiles).toHaveBeenCalledTimes(2)
  })
})
