// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, { useEffect, useRef } from 'react';
import { IntlProvider } from 'react-intl';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { History } from 'history';

import TelemetryClient from './telemetry/telemetryClient';

import { getMessages } from './i18n';
import { FlashMessages } from './components/flashMessages';
import NewVersionBanner from './components/newVersionBanner';
import { Utils } from './utils';
import { fetchMe, getMe } from './store/users';
import { getLanguage, fetchLanguage } from './store/language';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { fetchClientConfig } from './store/clientConfig';
import FocalboardRouter from './router';
import wsClient from './wsclient';
import { addNotification, Notification, updateNotifications } from './store/notifications';
import { BoardMember } from './blocks/board';
import octoClient, { NotificationToSend } from './octoClient';
import { Block } from './blocks/block';

import { IUser } from './user';

type Props = {
    history?: History<unknown>;
};

// @ işaretinden sonra kullanıcı adını çıkarmak için regex
const atMentionRegexp = /\B@([a-z0-9.\-_]+)/gi;

const extractMentions = (text: string): string[] => {
    if (!text || !text.includes('@')) {
        return [];
    }
    atMentionRegexp.lastIndex = 0;
    const mentions: string[] = [];
    let match;
    while ((match = atMentionRegexp.exec(text)) !== null) {
        if (match[1]) {
            mentions.push(match[1].toLowerCase());
        }
    }
    return mentions;
};

// Önceki kart durumlarını takip etmek için bir tür tanımlayalım
interface CardAssignmentState {
    lastAssignedIds: string[]; // Son kullanıcı atamaları
    lastUpdateTime: number;    // Son güncelleme zamanı
}

// Pano üyeliklerini takip etmek için bir arayüz
interface BoardMembershipState {
    userId: string;
    boardId: string;
    roles: string[];  // Kullanıcının rolleri
    lastUpdateTime: number;
}

const App = (props: Props): JSX.Element => {
    const language = useAppSelector<string>(getLanguage);
    const me = useAppSelector<IUser | null>(getMe);
    const dispatch = useAppDispatch();
    
    // Son bildirimleri takip etmek için bir ref oluşturuyoruz
    // Bu, aynı bildirimin tekrar gönderilmesini önlemeye yardımcı olacak
    const lastNotifiedBoardMembersRef = useRef<Map<string, string>>(new Map());
    const lastNotifiedCardAssignmentsRef = useRef<Map<string, string>>(new Map());
    
    // Kart atamalarının son durumlarını takip edelim
    const cardAssignmentsStateRef = useRef<Map<string, CardAssignmentState>>(new Map());
    
    // Pano üyeliklerinin durumunu takip edelim
    const boardMembershipsRef = useRef<Map<string, BoardMembershipState>>(new Map());

    // Bildirimleri sunucudan yükle
    const loadNotifications = async () => {
        if (!me) return;

        try {
            const result = await octoClient.getNotifications({ limit: 100 });
            if (result.success && result.data) {
                // Sunucudan gelen bildirimleri Redux store'a ekle
                const notifications: Notification[] = result.data.map(notification => ({
                    id: notification.id,
                    message: notification.message,
                    from: notification.from,
                    createdAt: notification.createAt,
                    read: notification.read,
                    link: notification.link,
                    boardId: notification.boardID,
                    cardId: notification.cardID,
                }));
                
                // Tüm bildirimlerle store'u güncelle - bu şekilde okunmuş
                // bildirimleri doğru şekilde senkronize ediyoruz
                dispatch(updateNotifications(notifications));
            }
        } catch (err) {
            Utils.logError(`Bildirimler yüklenirken hata oluştu: ${err}`);
        }
    };

    // Bildirim oluştur ve hem Redux'a hem de sunucuya kaydet
    const createNotification = async (notification: Notification) => {
        // Redux store'a ekle
        dispatch(addNotification(notification));

        // Sunucuya gönder
        try {
            const notificationToSend: NotificationToSend = {
                message: notification.message,
                from: notification.from,
                link: notification.link,
                boardID: notification.boardId,
                cardID: notification.cardId,
                read: notification.read,
            };

            await octoClient.createNotification(notificationToSend);
        } catch (err) {
            Utils.logError(`Bildirim sunucuya kaydedilirken hata oluştu: ${err}`);
        }
    };

    useEffect(() => {
        dispatch(fetchLanguage());
        dispatch(fetchMe());
        dispatch(fetchClientConfig());
    }, [dispatch]);

    useEffect(() => {
        if (me) {
            TelemetryClient.setUser(me);
            // Kullanıcı oturum açtığında bildirimleri yükle
            loadNotifications();
            
            // Üyeliklerimi de almaya çalışalım ki başlangıçta bir referans noktamız olsun
            const loadMemberships = async () => {
                try {
                    const myMemberships = await octoClient.getMyBoardMemberships();
                    if (myMemberships && myMemberships.length > 0) {
                        for (const membership of myMemberships) {
                            // Mevcut üyeliklerimizi kaydet
                            const membershipKey = `${membership.userId}-${membership.boardId}`;
                            const roles = [];
                            if (membership.schemeAdmin) roles.push('admin');
                            if (membership.schemeEditor) roles.push('editor');
                            if (membership.schemeCommenter) roles.push('commenter');
                            if (membership.schemeViewer) roles.push('viewer');
                            
                            boardMembershipsRef.current.set(membershipKey, {
                                userId: membership.userId,
                                boardId: membership.boardId,
                                roles,
                                lastUpdateTime: Date.now()
                            });
                        }
                    }
                } catch (err) {
                    Utils.logError(`Üyelikler yüklenirken hata oluştu: ${err}`);
                }
            };
            
            loadMemberships();
        }
    }, [me]);

    // --- BoardMember bildirimleri ---
    useEffect(() => {
        if (!me) return;

        const handleBoardMemberChange = async (_: typeof wsClient, members: BoardMember[]) => {
            for (const bm of members) {
                // Sadece şu anda oturum açmış olan kullanıcı için işlem yap
                if (bm.userId === me.id) {
                    try {
                        const now = Date.now();
                        // Üyelik anahtarını oluştur
                        const membershipKey = `${bm.userId}-${bm.boardId}`;
                        
                        // Daha önce bu panoda üyeliğim var mıydı kontrol et
                        const prevMembership = boardMembershipsRef.current.get(membershipKey);
                        
                        // Mevcut rolleri belirle
                        const currentRoles = [];
                        if (bm.schemeAdmin) currentRoles.push('admin');
                        if (bm.schemeEditor) currentRoles.push('editor');
                        if (bm.schemeCommenter) currentRoles.push('commenter');
                        if (bm.schemeViewer) currentRoles.push('viewer');
                        
                        // Tahta bilgilerini getir
                        const board = await octoClient.getBoard(bm.boardId);
                        if (!board) continue;
                        
                        // Yeni eklenen bir üyelik mi ya da rol değişikliği mi?
                        const isNewMembership = !prevMembership;
                        let roleChanged = false;
                        
                        // Eğer önceki üyelik varsa, rol değişimini kontrol et
                        if (prevMembership) {
                            // Herhangi bir rol değişikliği var mı?
                            const prevRoles = prevMembership.roles;
                            roleChanged = (
                                (bm.schemeAdmin && !prevRoles.includes('admin')) ||
                                (bm.schemeEditor && !prevRoles.includes('editor')) ||
                                (bm.schemeCommenter && !prevRoles.includes('commenter')) ||
                                (bm.schemeViewer && !prevRoles.includes('viewer'))
                            );
                        }
                        
                        // Sadece yeni üyelik veya rol değişiminde bildirim gönder
                        if (isNewMembership || roleChanged) {
                            // Bildirim anahtarını oluştur
                            const notificationKey = `${bm.userId}-${bm.boardId}-${bm.schemeAdmin}-${bm.schemeEditor}-${bm.schemeCommenter}-${bm.schemeViewer}`;
                            
                            // Son bildirim zamanını kontrol et
                            const lastNotifiedTime = lastNotifiedBoardMembersRef.current.get(notificationKey);
                            const fiveMinutesInMs = 5 * 60 * 1000;
                            
                            if (!lastNotifiedTime || now - parseInt(lastNotifiedTime) >= fiveMinutesInMs) {
                                // Bildirim mesajını hazırla
                                let msg = '';
                                
                                if (isNewMembership) {
                                    msg = bm.schemeAdmin
                                        ? `${board.title} tahtasına yönetici olarak eklendiniz`
                                        : `${board.title} tahtasına eklendiniz`;
                                } else if (roleChanged) {
                                    // Rol değişimi için daha açıklayıcı mesaj
                                    if (bm.schemeAdmin) {
                                        msg = `${board.title} tahtasında rolünüz 'yönetici' olarak güncellendi`;
                                    } else if (bm.schemeEditor) {
                                        msg = `${board.title} tahtasında rolünüz 'düzenleyici' olarak güncellendi`;
                                    } else if (bm.schemeCommenter) {
                                        msg = `${board.title} tahtasında rolünüz 'yorumcu' olarak güncellendi`;
                                    } else if (bm.schemeViewer) {
                                        msg = `${board.title} tahtasında rolünüz 'görüntüleyici' olarak güncellendi`;
                                    }
                                }
                                
                                // Bildirim oluştur
                                await createNotification({
                                    id: `board-member-${bm.userId}-${bm.boardId}-${now}`,
                                    message: msg,
                                    from: 'Sistem',
                                    createdAt: now,
                                    read: false,
                                    link: `/board/${bm.boardId}`,
                                    boardId: bm.boardId,
                                });
                                
                                // Bu değişiklik için bildirim gönderildiğini kaydet
                                lastNotifiedBoardMembersRef.current.set(notificationKey, now.toString());
                            }
                        }
                        
                        // Üyelik durumunu güncelle (sonraki değişiklik için referans olacak)
                        boardMembershipsRef.current.set(membershipKey, {
                            userId: bm.userId,
                            boardId: bm.boardId,
                            roles: currentRoles,
                            lastUpdateTime: now
                        });
                    } catch (err) {
                        Utils.logError(`Tahta üyeliği bildirimi oluşturulurken hata oluştu: ${err}`);
                    }
                }
            }
        };

        wsClient.addOnChange(handleBoardMemberChange, 'boardMembers');
        return () => {
            wsClient.removeOnChange(handleBoardMemberChange, 'boardMembers');
        };
    }, [me, dispatch]);

    // --- Block değişiklikleri: mention ve atama ---
    useEffect(() => {
        if (!me) return;

        const handleBlockChange = async (_: typeof wsClient, blocks: Block[]) => {
            for (const block of blocks) {
                // 1) @mention bildirimleri
                if (
                    (block.type === 'text' || block.type === 'comment' || block.type === 'image') &&
                    block.title
                ) {
                    try {
                        const mentions = extractMentions(block.title);
                        if (me.username && mentions.includes(me.username.toLowerCase())) {
                            const board = await octoClient.getBoard(block.boardId);
                            const card = block.parentId
                                ? await octoClient.getBlock(block.boardId, block.parentId)
                                : null;

                            // Kart başlığını alıp kısaltıyoruz
                            let cardTitle = card?.title ?? block.title;
                            if (cardTitle.length > 20) {
                                cardTitle = `${cardTitle.substring(0, 17)}...`;
                            }

                            // Kimden gelsin?
                            let from = 'Sistem';
                            if (block.createdBy) {
                                try {
                                    const usr = await octoClient.getUser(block.createdBy);
                                    if (usr) from = usr.username;
                                } catch {
                                    /* ignore */
                                }
                            }

                            await createNotification({
                                id: `mention-${block.id}-${Date.now()}`,
                                message: `${from} sizi "${board?.title}" tablosundaki "${cardTitle}" kartına etiketledi`,
                                from: 'Sistem',
                                createdAt: Date.now(),
                                read: false,
                                link: `/board/${block.boardId}/${block.id}`,
                                boardId: block.boardId,
                                cardId: card?.id ?? (block.type !== 'comment' ? block.id : undefined),
                            });
                        }
                    } catch (err) {
                        Utils.logError(`Etiketleme bildirimi oluşturulurken hata oluştu: ${err}`);
                    }
                }

                // 2) Kart atama bildirimleri
                if (block.type === 'card' && block.fields?.properties) {
                    const props = block.fields.properties as Record<string, any>;
                    try {
                        const board = await octoClient.getBoard(block.boardId);
                        if (!board?.cardProperties) continue;

                        for (const tpl of board.cardProperties) {
                            if (
                                (tpl.type === 'person' || tpl.type === 'multiPerson') &&
                                props[tpl.id]
                            ) {
                                const now = Date.now();
                                const stateKey = `${block.id}-${tpl.id}`;
                                
                                // Mevcut atanmış kullanıcı IDs
                                const assignedIds = Array.isArray(props[tpl.id])
                                    ? props[tpl.id]
                                    : [props[tpl.id]];
                                
                                // Bu kart ve özellik kombinasyonu için önceki durumu al
                                const prevState = cardAssignmentsStateRef.current.get(stateKey);
                                
                                // Yalnızca gerçekten YENİ eklenen kullanıcıya bildirim gönder
                                // Eğer önceki durumda bu kullanıcı yoksa, yeni eklenmiş demektir
                                if (assignedIds.includes(me.id)) {
                                    // Kullanıcı şu anda atanmış, önceki durumu kontrol et
                                    const isNewlyAssigned = !prevState || !prevState.lastAssignedIds.includes(me.id);
                                    
                                    if (isNewlyAssigned) {
                                        // Bu bir yeni atama! Bildirim gönder
                                        const fiveMinutesInMs = 5 * 60 * 1000;
                                        
                                        // Son bildirimi kontrol et
                                        const notificationKey = `card-assign-${block.id}-${tpl.id}-${me.id}`;
                                        const lastNotifiedTime = lastNotifiedCardAssignmentsRef.current.get(notificationKey);
                                        
                                        if (!lastNotifiedTime || now - parseInt(lastNotifiedTime) >= fiveMinutesInMs) {
                                            await createNotification({
                                                id: `card-assign-${block.id}-${tpl.id}-${now}`,
                                                message: `"${block.title}" kartında "${tpl.name}" olarak atandınız`,
                                                from: 'Sistem',
                                                createdAt: now,
                                                read: false,
                                                link: `/board/${block.boardId}/${block.id}`,
                                                boardId: block.boardId,
                                                cardId: block.id,
                                            });
                                            
                                            // Bu atama için bildirim gönderildiğini kaydet
                                            lastNotifiedCardAssignmentsRef.current.set(notificationKey, now.toString());
                                        }
                                    }
                                }
                                
                                // Kart durumunu güncelle (bir sonraki değişiklik için referans olacak)
                                cardAssignmentsStateRef.current.set(stateKey, {
                                    lastAssignedIds: [...assignedIds],
                                    lastUpdateTime: now
                                });
                            }
                        }
                    } catch (err) {
                        Utils.logError(`Kart ataması bildirimi oluşturulurken hata oluştu: ${err}`);
                    }
                }
            }
        };

        wsClient.addOnChange(handleBlockChange, 'block');
        return () => {
            wsClient.removeOnChange(handleBlockChange, 'block');
        };
    }, [me, dispatch]);

    return (
        <IntlProvider locale={language.split(/[_]/)[0]} messages={getMessages(language)}>
            <DndProvider backend={Utils.isMobile() ? TouchBackend : HTML5Backend}>
                <FlashMessages milliseconds={2000} />
                <div id="frame">
                    <div id="main">
                        <NewVersionBanner />
                        <FocalboardRouter history={props.history} />
                    </div>
                </div>
            </DndProvider>
        </IntlProvider>
    );
};

export default React.memo(App);
