// Test setup file for Vitest
import { vi } from 'vitest'

// Mock Vue Router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }),
  useRoute: () => ({
    path: '/',
    params: {},
    query: {},
    meta: {}
  }),
  createRouter: vi.fn(),
  createWebHistory: vi.fn()
}))

// Mock user store
vi.mock('@/stores/userStore', () => ({
  useUserStore: () => ({
    user: null,
    token: null,
    login: vi.fn(),
    logout: vi.fn(),
    fetchUser: vi.fn(),
    clearUser: vi.fn()
  })
}))

// Global test helpers
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))
