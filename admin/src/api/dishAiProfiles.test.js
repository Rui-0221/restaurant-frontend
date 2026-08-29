import { afterEach, describe, expect, it } from 'vitest'
import request from './index'
import { getDishAiProfiles, saveDishAiProfile } from './dishAiProfiles'

const originalAdapter = request.defaults.adapter

const replyWith =
  (data, observe = () => {}) =>
  async (config) => {
    observe(config)
    return {
      data: { code: 1, msg: 'success', data },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }
  }

afterEach(() => {
  request.defaults.adapter = originalAdapter
})

describe('AI 菜品手册接口', () => {
  it('读取全部菜品资料', async () => {
    let sentConfig
    request.defaults.adapter = replyWith([{ dishId: 1, profileStatus: 'VERIFIED' }], (config) => {
      sentConfig = config
    })

    const result = await getDishAiProfiles()

    expect(sentConfig.method).toBe('get')
    expect(sentConfig.url).toBe('/admin/dish-ai-profiles')
    expect(result).toEqual([{ dishId: 1, profileStatus: 'VERIFIED' }])
  })

  it('按菜品 ID 保存资料且不把路径 ID 混入请求体', async () => {
    let sentConfig
    request.defaults.adapter = replyWith('保存成功', (config) => {
      sentConfig = config
    })
    const profile = {
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

    await saveDishAiProfile(9, profile)

    expect(sentConfig.method).toBe('put')
    expect(sentConfig.url).toBe('/admin/dish-ai-profiles/9')
    expect(JSON.parse(sentConfig.data)).toEqual(profile)
  })
})
