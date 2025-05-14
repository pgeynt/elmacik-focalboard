// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSlice, PayloadAction} from '@reduxjs/toolkit'

export interface Notification {
    id: string
    message: string
    from: string
    createdAt: number
    read: boolean
    link?: string
    boardId?: string
    cardId?: string
}

export interface NotificationsState {
    notifications: Notification[]
    unreadCount: number
}

const initialState: NotificationsState = {
    notifications: [],
    unreadCount: 0,
}

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<Notification>) => {
            // Eğer bu ID ile bir bildirim zaten varsa, yeni bildirim ekleme
            const existingNotificationIndex = state.notifications.findIndex(n => n.id === action.payload.id)
            if (existingNotificationIndex !== -1) {
                // Eğer mevcut bildirim durumu okunmamış ve yeni gelen okunmuş ise,
                // sayacı azalt
                if (!state.notifications[existingNotificationIndex].read && action.payload.read) {
                    state.unreadCount -= 1
                }
                // Mevcut bildirimi güncelle
                state.notifications[existingNotificationIndex] = action.payload
                return
            }

            // Yeni bildirim ekleniyor
            state.notifications.unshift(action.payload)
            if (!action.payload.read) {
                state.unreadCount += 1
            }
        },
        updateNotifications: (state, action: PayloadAction<Notification[]>) => {
            // Yeni bildirimleri eklemek yerine mevcut bildirimlerle birleştir
            const updatedNotifications: Notification[] = [...state.notifications]
            let unreadCount = 0

            // Gelen bildirimleri ekle veya güncelle
            action.payload.forEach(notification => {
                const existingIndex = updatedNotifications.findIndex(n => n.id === notification.id)
                if (existingIndex !== -1) {
                    updatedNotifications[existingIndex] = notification
                } else {
                    updatedNotifications.unshift(notification)
                }

                // Okunmamış bildirim sayısını hesapla
                if (!notification.read) {
                    unreadCount++
                }
            })

            // Benzersiz bildirimlere göre dizi oluştur
            const notificationMap = new Map<string, Notification>()
            updatedNotifications.forEach(notification => {
                notificationMap.set(notification.id, notification)
            })

            // Son durumu güncelle
            state.notifications = Array.from(notificationMap.values())
                .sort((a, b) => b.createdAt - a.createdAt) // Tarihe göre sırala
            state.unreadCount = state.notifications.filter(n => !n.read).length
        },
        markAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload)
            if (notification && !notification.read) {
                notification.read = true
                state.unreadCount -= 1
            }
        },
        markAllAsRead: (state) => {
            state.notifications.forEach(notification => {
                notification.read = true
            })
            state.unreadCount = 0
        },
        clearNotifications: (state) => {
            state.notifications = []
            state.unreadCount = 0
        },
    },
})

export const {addNotification, updateNotifications, markAsRead, markAllAsRead, clearNotifications} = notificationsSlice.actions
export default notificationsSlice.reducer 