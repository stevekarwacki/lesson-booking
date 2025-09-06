import { describe, test, expect, beforeEach, vi } from 'vitest'
import { defineAbilitiesFor } from '../utils/abilities'
import { subject } from '@casl/ability'

// Route permissions test data
const routePermissions = [
  { 
    path: '/admin/users',
    meta: { permission: { action: 'manage', subject: 'User' } },
    expectedRoles: ['admin']
  },
  { 
    path: '/instructor/calendar',
    meta: { permission: { action: 'manage', subject: 'Calendar' } },
    expectedRoles: ['admin', 'instructor']
  },
  { 
    path: '/availability',
    meta: { permission: { action: 'manage', subject: 'Availability' } },
    expectedRoles: ['admin', 'instructor']
  },
  { 
    path: '/book-lesson',
    meta: { permission: { action: 'create', subject: 'Booking' } },
    expectedRoles: ['admin', 'instructor', 'student']
  }
]

describe('Router Permission Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Test CASL abilities work correctly
  test('should create correct abilities for different user roles', () => {
    const adminUser = { id: 1, role: 'admin' }
    const instructorUser = { id: 2, role: 'instructor' }
    const studentUser = { id: 3, role: 'student' }

    const adminAbility = defineAbilitiesFor(adminUser)
    const instructorAbility = defineAbilitiesFor(instructorUser)
    const studentAbility = defineAbilitiesFor(studentUser)

    // Admin should be able to manage users
    expect(adminAbility.can('manage', 'User')).toBe(true)
    expect(adminAbility.can('manage', 'Calendar')).toBe(true)

    // Instructor should be able to manage calendar but not users
    expect(instructorAbility.can('manage', 'Calendar')).toBe(true)
    expect(instructorAbility.can('manage', 'User')).toBe(false)

    // Student should not be able to manage anything
    expect(studentAbility.can('manage', 'User')).toBe(false)
    expect(studentAbility.can('manage', 'Calendar')).toBe(false)
  })

  test('should allow admin to access admin routes', () => {
    const adminUser = { id: 1, role: 'admin' }
    const ability = defineAbilitiesFor(adminUser)
    
    expect(ability.can('manage', 'User')).toBe(true)
    expect(ability.can('manage', 'Instructor')).toBe(true)
    expect(ability.can('manage', 'Package')).toBe(true)
  })

  test('should allow instructor to access instructor routes', () => {
    const instructorUser = { id: 2, role: 'instructor' }
    const ability = defineAbilitiesFor(instructorUser)
    
    expect(ability.can('manage', 'Calendar')).toBe(true)
    expect(ability.can('manage', 'Availability')).toBe(true)
    expect(ability.can('manage', 'User')).toBe(false) // Should not access admin routes
  })

  test('should deny instructor from accessing admin routes', () => {
    const instructorUser = { id: 2, role: 'instructor' }
    const ability = defineAbilitiesFor(instructorUser)
    
    expect(ability.can('manage', 'User')).toBe(false)
    expect(ability.can('manage', 'Instructor')).toBe(false)
    expect(ability.can('manage', 'Package')).toBe(false)
  })

  test('should deny student from accessing admin or instructor routes', () => {
    const studentUser = { id: 3, role: 'student' }
    const ability = defineAbilitiesFor(studentUser)
    
    expect(ability.can('manage', 'User')).toBe(false)
    expect(ability.can('manage', 'Calendar')).toBe(false)
    expect(ability.can('manage', 'Availability')).toBe(false)
  })

  test('should allow students basic permissions', () => {
    const studentUser = { id: 3, role: 'student' }
    const ability = defineAbilitiesFor(studentUser)
    
    expect(ability.can('create', 'Booking')).toBe(true)
    expect(ability.can('read', subject('Booking', { student_id: 3 }))).toBe(true)
    expect(ability.can('purchase', 'Subscription')).toBe(true)
  })

  // Test route-specific permissions
  test('should validate route permissions correctly', () => {
    const users = [
      { user: { id: 1, role: 'admin' }, name: 'Admin' },
      { user: { id: 2, role: 'instructor' }, name: 'Instructor' },
      { user: { id: 3, role: 'student' }, name: 'Student' }
    ]

    for (const route of routePermissions) {
      for (const { user, name } of users) {
        const ability = defineAbilitiesFor(user)
        const { action, subject } = route.meta.permission
        const canAccess = ability.can(action, subject)
        const shouldAllow = route.expectedRoles.includes(user.role)
        
        expect(canAccess).toBe(shouldAllow, 
          `${name} should ${shouldAllow ? '' : 'NOT '}be able to ${action} ${subject}`)
      }
    }
  })
})
