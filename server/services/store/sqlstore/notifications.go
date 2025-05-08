package sqlstore

import (
	"database/sql"

	sq "github.com/Masterminds/squirrel"
	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/utils"

	"github.com/mattermost/mattermost/server/public/shared/mlog"
)

// Schema constants
const (
	notificationsTableName = "notifications"
)

// SaveNotification kayıt eder veya günceller
func (s *SQLStore) SaveNotification(notification *model.Notification) (*model.Notification, error) {
	if notification.ID == "" {
		notification.ID = utils.NewID(utils.IDTypeBlock)
	}

	queryInsert := s.getQueryBuilder(s.db).
		Insert(s.tablePrefix+notificationsTableName).
		Columns(
			"id",
			"user_id",
			"message",
			"from_user",
			"create_at",
			"read",
			"link",
			"board_id",
			"card_id",
		).
		Values(
			notification.ID,
			notification.UserID,
			notification.Message,
			notification.From,
			notification.CreateAt,
			notification.Read,
			notification.Link,
			notification.BoardID,
			notification.CardID,
		)

	if _, err := queryInsert.Exec(); err != nil {
		s.logger.Error("Cannot insert notification", mlog.Err(err))
		return nil, err
	}

	return notification, nil
}

// GetNotificationsForUser kullanıcının bildirimlerini getirir
func (s *SQLStore) GetNotificationsForUser(userID string, limit, offset int) ([]*model.Notification, error) {
	query := s.getQueryBuilder(s.db).
		Select(
			"id",
			"user_id",
			"message",
			"from_user",
			"create_at",
			"read",
			"link",
			"board_id",
			"card_id",
		).
		From(s.tablePrefix + notificationsTableName).
		Where(sq.Eq{"user_id": userID}).
		OrderBy("create_at DESC")

	if limit > 0 {
		query = query.Limit(uint64(limit))
	}

	if offset > 0 {
		query = query.Offset(uint64(offset))
	}

	rows, err := query.Query()
	if err != nil {
		s.logger.Error("Cannot get notifications for user", mlog.Err(err))
		return nil, err
	}
	defer rows.Close()

	return s.notificationsFromRows(rows)
}

// GetUnreadNotificationsCountForUser kullanıcının okunmamış bildirim sayısını döndürür
func (s *SQLStore) GetUnreadNotificationsCountForUser(userID string) (int, error) {
	query := s.getQueryBuilder(s.db).
		Select("COUNT(id)").
		From(s.tablePrefix + notificationsTableName).
		Where(sq.Eq{"user_id": userID}).
		Where(sq.Eq{"read": false})

	row := query.QueryRow()

	var count int
	err := row.Scan(&count)
	if err != nil {
		s.logger.Error("Cannot get unread notifications count", mlog.Err(err))
		return 0, err
	}

	return count, nil
}

// GetNotification bildirim detayını getirir
func (s *SQLStore) GetNotification(notificationID string) (*model.Notification, error) {
	query := s.getQueryBuilder(s.db).
		Select(
			"id",
			"user_id",
			"message",
			"from_user",
			"create_at",
			"read",
			"link",
			"board_id",
			"card_id",
		).
		From(s.tablePrefix + notificationsTableName).
		Where(sq.Eq{"id": notificationID})

	row := query.QueryRow()

	notification := model.Notification{}
	err := row.Scan(
		&notification.ID,
		&notification.UserID,
		&notification.Message,
		&notification.From,
		&notification.CreateAt,
		&notification.Read,
		&notification.Link,
		&notification.BoardID,
		&notification.CardID,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		s.logger.Error("Cannot get notification", mlog.Err(err))
		return nil, err
	}

	return &notification, nil
}

// UpdateNotificationReadStatus bildirimin okunma durumunu günceller
func (s *SQLStore) UpdateNotificationReadStatus(notificationID string, read bool) error {
	query := s.getQueryBuilder(s.db).
		Update(s.tablePrefix + notificationsTableName).
		Set("read", read).
		Where(sq.Eq{"id": notificationID})

	_, err := query.Exec()
	if err != nil {
		s.logger.Error("Cannot update notification read status", mlog.Err(err))
		return err
	}

	return nil
}

// DeleteNotification bildirimi siler
func (s *SQLStore) DeleteNotification(notificationID string) error {
	query := s.getQueryBuilder(s.db).
		Delete(s.tablePrefix + notificationsTableName).
		Where(sq.Eq{"id": notificationID})

	_, err := query.Exec()
	if err != nil {
		s.logger.Error("Cannot delete notification", mlog.Err(err))
		return err
	}

	return nil
}

// DeleteNotificationsForUser kullanıcının tüm bildirimlerini siler
func (s *SQLStore) DeleteNotificationsForUser(userID string) error {
	query := s.getQueryBuilder(s.db).
		Delete(s.tablePrefix + notificationsTableName).
		Where(sq.Eq{"user_id": userID})

	_, err := query.Exec()
	if err != nil {
		s.logger.Error("Cannot delete notifications for user", mlog.Err(err))
		return err
	}

	return nil
}

// notificationsFromRows satırlardan bildirim nesneleri oluşturur
func (s *SQLStore) notificationsFromRows(rows *sql.Rows) ([]*model.Notification, error) {
	notifications := []*model.Notification{}

	for rows.Next() {
		notification := model.Notification{}
		err := rows.Scan(
			&notification.ID,
			&notification.UserID,
			&notification.Message,
			&notification.From,
			&notification.CreateAt,
			&notification.Read,
			&notification.Link,
			&notification.BoardID,
			&notification.CardID,
		)
		if err != nil {
			s.logger.Error("Cannot scan notification", mlog.Err(err))
			return nil, err
		}
		notifications = append(notifications, &notification)
	}

	return notifications, nil
} 