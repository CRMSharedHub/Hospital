import { describe, expect, it, beforeEach } from 'vitest'
import { useNotificationStore } from './notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll()
  })

  it('starts with empty notifications', () => {
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('adds a notification with generated id, createdAt, and read=false', () => {
    useNotificationStore.getState().addNotification({
      type: 'appointment_today',
      title: 'Test',
      message: 'Message',
    })
    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].id).toBeTruthy()
    expect(state.notifications[0].createdAt).toBeTruthy()
    expect(state.notifications[0].read).toBe(false)
    expect(state.notifications[0].title).toBe('Test')
  })

  it('prevents duplicate notifications (same type + message)', () => {
    useNotificationStore.getState().addNotification({ type: 'medicine_low_stock', title: 'A', message: '50' })
    useNotificationStore.getState().addNotification({ type: 'medicine_low_stock', title: 'A', message: '50' })
    expect(useNotificationStore.getState().notifications).toHaveLength(1)
  })

  it('allows different notifications', () => {
    useNotificationStore.getState().addNotification({ type: 'medicine_low_stock', title: 'A', message: '50' })
    useNotificationStore.getState().addNotification({ type: 'medicine_low_stock', title: 'B', message: '30' })
    expect(useNotificationStore.getState().notifications).toHaveLength(2)
  })

  it('marks a notification as read', () => {
    useNotificationStore.getState().addNotification({ type: 'lab_result_ready', title: 'CBC', message: 'Done' })
    const id = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().markAsRead(id)
    expect(useNotificationStore.getState().notifications[0].read).toBe(true)
  })

  it('marks all as read', () => {
    useNotificationStore.getState().addNotification({ type: 'lab_result_ready', title: 'A', message: '1' })
    useNotificationStore.getState().addNotification({ type: 'lab_result_ready', title: 'B', message: '2' })
    useNotificationStore.getState().markAllAsRead()
    expect(useNotificationStore.getState().notifications.every((n) => n.read)).toBe(true)
  })

  it('removes a notification', () => {
    useNotificationStore.getState().addNotification({ type: 'lab_result_ready', title: 'A', message: '1' })
    const id = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().removeNotification(id)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('clears all notifications', () => {
    useNotificationStore.getState().addNotification({ type: 'lab_result_ready', title: 'A', message: '1' })
    useNotificationStore.getState().addNotification({ type: 'lab_result_ready', title: 'B', message: '2' })
    useNotificationStore.getState().clearAll()
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })

  it('limits to 50 notifications', () => {
    for (let i = 0; i < 55; i++) {
      useNotificationStore.getState().addNotification({ type: 'lab_result_ready', title: `T${i}`, message: `M${i}` })
    }
    expect(useNotificationStore.getState().notifications).toHaveLength(50)
  })

  it('hasNotification checks correctly', () => {
    useNotificationStore.getState().addNotification({ type: 'medicine_out_of_stock', title: 'A', message: 'X' })
    expect(useNotificationStore.getState().hasNotification('medicine_out_of_stock', 'X')).toBe(true)
    expect(useNotificationStore.getState().hasNotification('medicine_out_of_stock', 'Y')).toBe(false)
  })
})
