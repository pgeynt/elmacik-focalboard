// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef, useEffect} from 'react'
import {useIntl} from 'react-intl'

import './notificationButton.scss'
import {useAppSelector} from '../../store/hooks'
import NotificationIcon from '../../widgets/icons/notification'
import NotificationMenu from './notificationMenu'
import MenuWrapper from '../../widgets/menuWrapper'

const NotificationButton = () => {
    const intl = useIntl()
    const {unreadCount} = useAppSelector((state) => state.notifications)
    
    return (
        <div className='NotificationButton'>
            <MenuWrapper>
                <div className='NotificationButtonWrapper'>
                    <button
                        className='NotificationButton__button'
                        aria-label={intl.formatMessage({id: 'NotificationButton.label', defaultMessage: 'Bildirimler'})}
                    >
                        <NotificationIcon />
                        {unreadCount > 0 && (
                            <div className='NotificationButton__unread-badge'>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </div>
                        )}
                    </button>
                </div>
                <NotificationMenu />
            </MenuWrapper>
        </div>
    )
}

export default NotificationButton 