// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import {FormattedMessage} from 'react-intl'

import ErrorIllustration from '../svg/error-illustration'

import './guestNoBoards.scss'

const GuestNoBoards = () => {
    return (
        <div className='GuestNoBoards'>
            <div>
                <div className='title'>
                    <FormattedMessage
                        id='guest-no-board.title'
                        defaultMessage={'Henüz pano yok'}
                    />
                </div>
                <div className='subtitle'>
                    <FormattedMessage
                        id='guest-no-board.subtitle'
                        defaultMessage={'Bu takımda henüz herhangi bir panoya erişiminiz yok, lütfen birisi sizi herhangi bir panoya ekleyene kadar bekleyin.'}
                    />
                </div>
                <ErrorIllustration/>
            </div>
        </div>
    )
}

export default React.memo(GuestNoBoards)
