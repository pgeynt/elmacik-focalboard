// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'

import './topBar.scss'
import {FormattedMessage} from 'react-intl'

import HelpIcon from '../widgets/icons/help'
import {Constants} from '../constants'
import NotificationButton from './notifications/notificationButton'

const TopBar = (): JSX.Element => {
    const focalboardFeedbackUrl = 'https://www.focalboard.com/fwlink/feedback-focalboard.html?v=' + Constants.versionString
    const helpUrl = `https://www.focalboard.com/fwlink/help-center.html?v=${Constants.versionString}`
    
    return (
        <div
            className='TopBar'
        >
            <div className='versionFrame'>
                <NotificationButton />
                <p
                    className='version'
                >
                    Elmacik
                </p>
        
               
            </div>
        </div>
    )
}

export default React.memo(TopBar)
