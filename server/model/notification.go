// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package model

import (
	"encoding/json"
	"io"
	"time"

	"github.com/mattermost/mattermost/server/v8/channels/utils"
)

// NotificationHint provides a hint that a block has been modified and has subscribers that
// should be notified.
// swagger:model
type NotificationHint struct {
	// BlockType is the block type of the entity (e.g. board, card) that was updated
	// required: true
	BlockType BlockType `json:"block_type"`

	// BlockID is id of the entity that was updated
	// required: true
	BlockID string `json:"block_id"`

	// ModifiedByID is the id of the user who made the block change
	ModifiedByID string `json:"modified_by_id"`

	// CreatedAt is the timestamp this notification hint was created in miliseconds since the current epoch
	// required: true
	CreateAt int64 `json:"create_at"`

	// NotifyAt is the timestamp this notification should be scheduled in miliseconds since the current epoch
	// required: true
	NotifyAt int64 `json:"notify_at"`
}

func (s *NotificationHint) IsValid() error {
	if s == nil {
		return ErrInvalidNotificationHint{"cannot be nil"}
	}
	if s.BlockID == "" {
		return ErrInvalidNotificationHint{"missing block id"}
	}
	if s.BlockType == "" {
		return ErrInvalidNotificationHint{"missing block type"}
	}
	if s.ModifiedByID == "" {
		return ErrInvalidNotificationHint{"missing modified_by id"}
	}
	return nil
}

func (s *NotificationHint) Copy() *NotificationHint {
	return &NotificationHint{
		BlockType:    s.BlockType,
		BlockID:      s.BlockID,
		ModifiedByID: s.ModifiedByID,
		CreateAt:     s.CreateAt,
		NotifyAt:     s.NotifyAt,
	}
}

func (s *NotificationHint) LogClone() interface{} {
	return struct {
		BlockType    BlockType `json:"block_type"`
		BlockID      string    `json:"block_id"`
		ModifiedByID string    `json:"modified_by_id"`
		CreateAt     string    `json:"create_at"`
		NotifyAt     string    `json:"notify_at"`
	}{
		BlockType:    s.BlockType,
		BlockID:      s.BlockID,
		ModifiedByID: s.ModifiedByID,
		CreateAt:     utils.TimeFromMillis(s.CreateAt).Format(time.StampMilli),
		NotifyAt:     utils.TimeFromMillis(s.NotifyAt).Format(time.StampMilli),
	}
}

type ErrInvalidNotificationHint struct {
	msg string
}

func (e ErrInvalidNotificationHint) Error() string {
	return e.msg
}

// Notification model definition
// swagger:model
type Notification struct {
	// ID of the notification
	// required: true
	ID string `json:"id"`

	// ID of the user that will receive the notification
	// required: true
	UserID string `json:"userID"`

	// Content of the notification message
	// required: true
	Message string `json:"message"`

	// Who the notification is from
	// required: true
	From string `json:"from"`

	// When the notification was created
	// required: true
	CreateAt int64 `json:"createAt"`

	// Whether the notification has been read
	// required: true
	Read bool `json:"read"`

	// Link to follow when notification is clicked
	// required: false
	Link string `json:"link,omitempty"`

	// ID of the related board, if applicable
	// required: false
	BoardID string `json:"boardID,omitempty"`

	// ID of the related card, if applicable
	// required: false
	CardID string `json:"cardID,omitempty"`
}

// NotificationList is a list of Notifications
// swagger:model
type NotificationList []*Notification

func NotificationFromJSON(data io.Reader) (*Notification, error) {
	var notification *Notification
	if err := json.NewDecoder(data).Decode(&notification); err != nil {
		return nil, err
	}
	return notification, nil
}

func NotificationListFromJSON(data io.Reader) (NotificationList, error) {
	var notifications NotificationList
	if err := json.NewDecoder(data).Decode(&notifications); err != nil {
		return nil, err
	}
	return notifications, nil
}
