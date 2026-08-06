import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppNotification } from '../types'

interface NotificationState {
  notifications: AppNotification[]
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  hasNotification: (type: string, message: string) => boolean
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (n) => {
        const state = get()
        if (state.hasNotification(n.type, n.message)) return
        const notification: AppNotification = {
          ...n,
          id: generateId(),
          createdAt: new Date().toISOString(),
          read: false,
        }
        set({ notifications: [notification, ...state.notifications].slice(0, 50) })
      },

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      hasNotification: (type, message) =>
        get().notifications.some((n) => n.type === type && n.message === message),
    }),
    { name: 'notification-storage' },
  ),
)
