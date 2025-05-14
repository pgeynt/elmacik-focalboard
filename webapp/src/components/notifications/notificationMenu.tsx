// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {useHistory} from 'react-router-dom'

import './notificationMenu.scss'
import {useAppSelector, useAppDispatch} from '../../store/hooks'
import {markAllAsRead, markAsRead} from '../../store/notifications'
import octoClient from '../../octoClient'
import {Utils} from '../../utils'

const NotificationMenu = () => {
    const intl = useIntl()
    const history = useHistory()
    const dispatch = useAppDispatch()
    
    const {notifications} = useAppSelector((state) => state.notifications)
    
    const handleNotificationClick = useCallback(async (id: string, link?: string) => {
        // Redux store'da bildirimi okundu olarak işaretle
        dispatch(markAsRead(id))
        
        // Sunucuya bildir
        try {
            await octoClient.markNotificationAsRead(id)
        } catch (err) {
            Utils.logError(`Bildirim okundu olarak işaretlenirken hata: ${err}`)
        }
        
        if (link) {
            history.push(link)
        }
    }, [dispatch, history])
    
    const handleMarkAllAsRead = useCallback(async () => {
        // Redux store'da tüm bildirimleri okundu olarak işaretle
        dispatch(markAllAsRead())
        
        // Sunucuya bildir
        try {
            await octoClient.markAllNotificationsAsRead()
        } catch (err) {
            Utils.logError(`Tüm bildirimler okundu olarak işaretlenirken hata: ${err}`)
        }
    }, [dispatch])
    
    if (notifications.length === 0) {
        return (
            <div className='NotificationMenu'>
                <div className='NotificationMenu__header'>
                    <span className='NotificationMenu__title'>
                        <FormattedMessage
                            id='NotificationMenu.title'
                            defaultMessage='Bildirimler'
                        />
                    </span>
                </div>
                <div className='NotificationMenu__content'>
                    <div className='NotificationMenu__empty'>
                        <FormattedMessage
                            id='NotificationMenu.empty'
                            defaultMessage='Bildirim bulunmuyor'
                        />
                    </div>
                </div>
            </div>
        )
    }
    
    return (
        <div className='NotificationMenu'>
            <div className='NotificationMenu__header'>
                <span className='NotificationMenu__title'>
                    <FormattedMessage
                        id='NotificationMenu.title'
                        defaultMessage='Bildirimler'
                    />
                </span>
                <button
                    className='NotificationMenu__mark-all'
                    onClick={handleMarkAllAsRead}
                >
                    <FormattedMessage
                        id='NotificationMenu.markAllAsRead'
                        defaultMessage='Tümünü okundu olarak işaretle'
                    />
                </button>
            </div>
            <div className='NotificationMenu__content'>
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`NotificationMenu__item ${notification.read ? 'read' : 'unread'}`}
                        onClick={() => handleNotificationClick(notification.id, notification.link)}
                    >
                        <div className='NotificationMenu__item-content'>
                            <div className='NotificationMenu__item-message'>
                                {notification.message}
                            </div>
                            <div className='NotificationMenu__item-meta'>
                                <span className='NotificationMenu__item-from'>
                                    {notification.from}
                                </span>
                                <span className='NotificationMenu__item-time'>
                                    {new Date(notification.createdAt).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default NotificationMenu 