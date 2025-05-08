// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect} from 'react'
import {IntlProvider} from 'react-intl'
import {DndProvider} from 'react-dnd'
import {HTML5Backend} from 'react-dnd-html5-backend'
import {TouchBackend} from 'react-dnd-touch-backend'
import {History} from 'history'

import TelemetryClient from './telemetry/telemetryClient'

import {getMessages} from './i18n'
import {FlashMessages} from './components/flashMessages'
import NewVersionBanner from './components/newVersionBanner'
import {Utils} from './utils'
import {fetchMe, getMe} from './store/users'
import {getLanguage, fetchLanguage} from './store/language'
import {useAppSelector, useAppDispatch} from './store/hooks'
import {fetchClientConfig} from './store/clientConfig'
import FocalboardRouter from './router'
import wsClient from './wsclient'
import {addNotification} from './store/notifications'
import {BoardMember} from './blocks/board'
import octoClient from './octoClient'
import {Block} from './blocks/block'

import {IUser} from './user'

type Props = {
    history?: History<unknown>
}

const App = (props: Props): JSX.Element => {
    const language = useAppSelector<string>(getLanguage)
    const me = useAppSelector<IUser|null>(getMe)
    const dispatch = useAppDispatch()

    useEffect(() => {
        dispatch(fetchLanguage())
        dispatch(fetchMe())
        dispatch(fetchClientConfig())
    }, [])

    useEffect(() => {
        if (me) {
            TelemetryClient.setUser(me)
        }
    }, [me])
    
    // WebSocket'ten gelen boardMember değişikliklerini dinle ve bildirim oluştur
    useEffect(() => {
        if (!me) {
            return
        }

        const handleBoardMemberChange = async (client: typeof wsClient, boardMembers: BoardMember[]) => {
            for (const boardMember of boardMembers) {
                // Sadece kendimize yapılan eklemeleri kontrol et
                // ve sadece yeni eklenen boardMember'lar için bildirim gönder
                if (boardMember.userId === me.id && boardMember.schemeAdmin) {
                    try {
                        // Tahta bilgilerini al
                        const board = await octoClient.getBoard(boardMember.boardId)
                        
                        if (board) {
                            // Bildirim oluştur
                            dispatch(addNotification({
                                id: `board-member-${boardMember.userId}-${boardMember.boardId}-${Date.now()}`,
                                message: `${board.title} tahtasına yönetici olarak eklendiniz`,
                                from: 'Sistem',
                                createdAt: Date.now(),
                                read: false,
                                link: `/board/${boardMember.boardId}`,
                                boardId: boardMember.boardId
                            }))
                        }
                    } catch (error) {
                        Utils.logError(`Tahta bilgileri alınırken hata oluştu: ${error}`)
                    }
                } else if (boardMember.userId === me.id) {
                    try {
                        // Tahta bilgilerini al
                        const board = await octoClient.getBoard(boardMember.boardId)
                        
                        if (board) {
                            // Bildirim oluştur
                            dispatch(addNotification({
                                id: `board-member-${boardMember.userId}-${boardMember.boardId}-${Date.now()}`,
                                message: `${board.title} tahtasına eklendiniz`,
                                from: 'Sistem',
                                createdAt: Date.now(),
                                read: false,
                                link: `/board/${boardMember.boardId}`,
                                boardId: boardMember.boardId
                            }))
                        }
                    } catch (error) {
                        Utils.logError(`Tahta bilgileri alınırken hata oluştu: ${error}`)
                    }
                }
            }
        }

        wsClient.addOnChange(handleBoardMemberChange, 'boardMembers')

        return () => {
            wsClient.removeOnChange(handleBoardMemberChange, 'boardMembers')
        }
    }, [me, dispatch])

    // Kart atamaları için bildirim oluştur - Block değişikliklerini dinle
    useEffect(() => {
        if (!me) {
            return
        }

        const handleBlockChange = async (client: typeof wsClient, blocks: Block[]) => {
            for (const block of blocks) {
                // Sadece kart tipi blokları kontrol et
                if (block.type === 'card' && block.fields && block.fields.properties) {
                    const properties = block.fields.properties as Record<string, any>
                    
                    try {
                        // Kartın bağlı olduğu tahtayı al
                        const board = await octoClient.getBoard(block.boardId)
                        if (!board || !board.cardProperties) {
                            continue
                        }
                        
                        // Tahta özelliklerini kontrol et
                        for (const propTemplate of board.cardProperties) {
                            const propId = propTemplate.id as string
                            const propType = propTemplate.type as string
                            const propName = propTemplate.name as string
                            
                            // Sadece person veya multiPerson tipindeki özellikleri kontrol et
                            if ((propType === 'person' || propType === 'multiPerson') && properties[propId]) {
                                let assignedUserIds: string[] = []
                                
                                // Tek kişi atama
                                if (typeof properties[propId] === 'string' && properties[propId] === me.id) {
                                    assignedUserIds.push(properties[propId] as string)
                                }
                                // Çoklu kişi atama
                                else if (Array.isArray(properties[propId])) {
                                    const userIds = properties[propId] as string[]
                                    if (userIds.includes(me.id)) {
                                        assignedUserIds.push(me.id)
                                    }
                                }
                                
                                // Kendimize bir atama bulunursa bildirim oluştur
                                if (assignedUserIds.includes(me.id)) {
                                    dispatch(addNotification({
                                        id: `card-assign-${block.id}-${propId}-${Date.now()}`,
                                        message: `"${block.title}" kartında "${propName}" olarak atandınız`,
                                        from: 'Sistem',
                                        createdAt: Date.now(),
                                        read: false,
                                        link: `/board/${block.boardId}/${block.id}`,
                                        boardId: block.boardId,
                                        cardId: block.id
                                    }))
                                }
                            }
                        }
                    } catch (error) {
                        Utils.logError(`Kart ataması bildirimi oluşturulurken hata oluştu: ${error}`)
                    }
                }
            }
        }

        wsClient.addOnChange(handleBlockChange, 'block')

        return () => {
            wsClient.removeOnChange(handleBlockChange, 'block')
        }
    }, [me, dispatch])

    return (
        <IntlProvider
            locale={language.split(/[_]/)[0]}
            messages={getMessages(language)}
        >
            <DndProvider backend={Utils.isMobile() ? TouchBackend : HTML5Backend}>
                <FlashMessages milliseconds={2000}/>
                <div id='frame'>
                    <div id='main'>
                        <NewVersionBanner/>
                        <FocalboardRouter history={props.history}/>
                    </div>
                </div>
            </DndProvider>
        </IntlProvider>
    )
}

export default React.memo(App)
