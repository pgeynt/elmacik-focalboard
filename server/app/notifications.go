// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"fmt"

	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/utils"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// CreateNotificationFromModel bildirim nesnesinden yeni bir bildirim oluşturur
func (a *App) CreateNotification(notification *model.Notification) (*model.Notification, error) {
	if notification.UserID == "" {
		return nil, fmt.Errorf("userID is required")
	}
	if notification.Message == "" {
		return nil, fmt.Errorf("message is required")
	}
	if notification.From == "" {
		return nil, fmt.Errorf("from is required")
	}

	// ID verilmediyse otomatik oluştur
	if notification.ID == "" {
		notification.ID = utils.NewID(utils.IDTypeBlock)
	}

	// CreateAt belirtilmediyse şu anı kullan
	if notification.CreateAt <= 0 {
		notification.CreateAt = utils.GetMillis()
	}

	// BoardID varsa ve Link belirtilmediyse otomatik oluştur
	if notification.BoardID != "" && notification.Link == "" {
		board, err := a.GetBoard(notification.BoardID)
		if err != nil {
			return nil, err
		}
		if board != nil {
			notification.Link = fmt.Sprintf("/boards/%s", notification.BoardID)
			if notification.CardID != "" {
				notification.Link = fmt.Sprintf("%s/%s", notification.Link, notification.CardID)
			}
		}
	}

	return a.store.SaveNotification(notification)
}

// CreateNotificationWithParams parametrelerden yeni bir bildirim oluşturur
func (a *App) CreateNotificationWithParams(userID, message, from string, boardID, cardID string) (*model.Notification, error) {
	if userID == "" {
		return nil, fmt.Errorf("userID is required")
	}
	if message == "" {
		return nil, fmt.Errorf("message is required")
	}
	if from == "" {
		return nil, fmt.Errorf("from is required")
	}

	notification := &model.Notification{
		ID:       utils.NewID(utils.IDTypeBlock),
		UserID:   userID,
		Message:  message,
		From:     from,
		CreateAt: utils.GetMillis(),
		Read:     false,
		BoardID:  boardID,
		CardID:   cardID,
	}

	if boardID != "" {
		board, err := a.GetBoard(boardID)
		if err != nil {
			return nil, err
		}
		if board != nil {
			notification.Link = fmt.Sprintf("/boards/%s", boardID)
			if cardID != "" {
				notification.Link = fmt.Sprintf("%s/%s", notification.Link, cardID)
			}
		}
	}

	return a.store.SaveNotification(notification)
}

// GetNotificationsForUser kullanıcının bildirimlerini getirir
func (a *App) GetNotificationsForUser(userID string, limit, offset int) ([]*model.Notification, error) {
	if userID == "" {
		return nil, fmt.Errorf("userID is required")
	}

	return a.store.GetNotificationsForUser(userID, limit, offset)
}

// GetUnreadNotificationsCount kullanıcının okunmamış bildirim sayısını döndürür
func (a *App) GetUnreadNotificationsCount(userID string) (int, error) {
	if userID == "" {
		return 0, fmt.Errorf("userID is required")
	}

	return a.store.GetUnreadNotificationsCountForUser(userID)
}

// GetNotification bildirim detayını getirir
func (a *App) GetNotification(notificationID string) (*model.Notification, error) {
	if notificationID == "" {
		return nil, fmt.Errorf("notificationID is required")
	}

	return a.store.GetNotification(notificationID)
}

// MarkNotificationAsRead bildirimi okundu olarak işaretler
func (a *App) MarkNotificationAsRead(notificationID string) error {
	if notificationID == "" {
		return fmt.Errorf("notificationID is required")
	}

	return a.store.UpdateNotificationReadStatus(notificationID, true)
}

// MarkAllNotificationsAsRead kullanıcının tüm bildirimlerini okundu olarak işaretler
func (a *App) MarkAllNotificationsAsRead(userID string) error {
	if userID == "" {
		return fmt.Errorf("userID is required")
	}

	notifications, err := a.store.GetNotificationsForUser(userID, 1000, 0)
	if err != nil {
		return err
	}

	for _, notification := range notifications {
		if !notification.Read {
			err = a.store.UpdateNotificationReadStatus(notification.ID, true)
			if err != nil {
				a.logger.Error("Error marking notification as read", mlog.String("notificationID", notification.ID), mlog.Err(err))
			}
		}
	}

	return nil
}

// DeleteNotification bildirimi siler
func (a *App) DeleteNotification(notificationID string) error {
	if notificationID == "" {
		return fmt.Errorf("notificationID is required")
	}

	return a.store.DeleteNotification(notificationID)
}

// CreateBoardMembershipNotification pano üyeliği değişikliğinde bildirim oluşturur
func (a *App) CreateBoardMembershipNotification(addedBy *model.User, userID string, boardID string) error {
	if userID == "" || addedBy == nil || boardID == "" {
		return fmt.Errorf("userID, addedBy and boardID are required")
	}

	// Kullanıcının kendisini eklemesi durumunda bildirim gönderme
	if userID == addedBy.ID {
		return nil
	}

	board, err := a.GetBoard(boardID)
	if err != nil {
		return err
	}
	if board == nil {
		return fmt.Errorf("board not found: %s", boardID)
	}

	message := fmt.Sprintf("%s sizi \"%s\" panosuna ekledi", addedBy.Username, board.Title)
	from := addedBy.Username

	_, err = a.CreateNotificationWithParams(userID, message, from, boardID, "")
	return err
}

// CreateCardAssignmentNotification kart atama bildirimlerini oluşturur
func (a *App) CreateCardAssignmentNotification(assignedBy *model.User, userID string, boardID string, cardID string, cardTitle string) error {
	if userID == "" || assignedBy == nil || boardID == "" || cardID == "" {
		return fmt.Errorf("userID, assignedBy, boardID and cardID are required")
	}

	// Kullanıcının kendisini ataması durumunda bildirim gönderme
	if userID == assignedBy.ID {
		return nil
	}

	message := fmt.Sprintf("%s sizi \"%s\" kartına atadı", assignedBy.Username, cardTitle)
	from := assignedBy.Username

	_, err := a.CreateNotificationWithParams(userID, message, from, boardID, cardID)
	return err
}

// CreateCardCommentNotification kart yorumlarında bildirim oluşturur
func (a *App) CreateCardCommentNotification(commentedBy *model.User, userID string, boardID string, cardID string, cardTitle string) error {
	if userID == "" || commentedBy == nil || boardID == "" || cardID == "" {
		return fmt.Errorf("userID, commentedBy, boardID and cardID are required")
	}

	// Kullanıcının kendi yorumlarında bildirim gönderme
	if userID == commentedBy.ID {
		return nil
	}

	message := fmt.Sprintf("%s, \"%s\" kartına yorum yaptı", commentedBy.Username, cardTitle)
	from := commentedBy.Username

	_, err := a.CreateNotificationWithParams(userID, message, from, boardID, cardID)
	return err
}

// DeleteNotificationsForUser kullanıcının tüm bildirimlerini siler
func (a *App) DeleteNotificationsForUser(userID string) error {
	if userID == "" {
		return fmt.Errorf("userID is required")
	}

	return a.store.DeleteNotificationsForUser(userID)
} 