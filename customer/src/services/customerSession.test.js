import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login, getMe } from '../api/user'
import { clearToken, setToken } from '../utils/storage'
import { loginAndLoadProfile } from './customerSession'

vi.mock('../api/user', () => ({ login: vi.fn(), getMe: vi.fn() }))
vi.mock('../utils/storage', () => ({ setToken: vi.fn(), clearToken: vi.fn() }))

describe('loginAndLoadProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('在加载资料前保存 token', async () => {
    const events = []
    login.mockResolvedValue('token-123')
    setToken.mockImplementation(() => events.push('set-token'))
    getMe.mockImplementation(async () => {
      events.push('get-me')
      return { id: 1, name: '顾客' }
    })

    await expect(
      loginAndLoadProfile({ phone: '13800000000', password: 'secret' }),
    ).resolves.toEqual({
      token: 'token-123',
      userInfo: { id: 1, name: '顾客' },
    })
    expect(events).toEqual(['set-token', 'get-me'])
  })

  it('在资料加载失败时清理临时 token', async () => {
    const error = new Error('未授权')
    login.mockResolvedValue('token-123')
    getMe.mockRejectedValue(error)

    await expect(loginAndLoadProfile({ phone: '13800000000', password: 'secret' })).rejects.toBe(
      error,
    )
    expect(clearToken).toHaveBeenCalledOnce()
  })
})
