// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/mattermost/focalboard/server/model"
	"github.com/mattermost/focalboard/server/services/audit"
)

func (a *API) registerNotificationsRoutes(r *mux.Router) {
	r.HandleFunc("/notifications", a.sessionRequired(a.handleGetNotifications)).Methods("GET")
	r.HandleFunc("/notifications", a.sessionRequired(a.handleCreateNotification)).Methods("POST")
	r.HandleFunc("/notifications/unread_count", a.sessionRequired(a.handleGetUnreadNotificationsCount)).Methods("GET")
	r.HandleFunc("/notifications/{notificationID}", a.sessionRequired(a.handleGetNotification)).Methods("GET")
	r.HandleFunc("/notifications/{notificationID}/read", a.sessionRequired(a.handleMarkNotificationAsRead)).Methods("PUT")
	r.HandleFunc("/notifications/mark_all_as_read", a.sessionRequired(a.handleMarkAllNotificationsAsRead)).Methods("PUT")
	r.HandleFunc("/notifications/{notificationID}", a.sessionRequired(a.handleDeleteNotification)).Methods("DELETE")
}

// handleGetNotifications kullanıcının bildirimlerini getirir
func (a *API) handleGetNotifications(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /notifications getNotifications
	//
	// Kullanıcının bildirimlerini getirir
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: limit
	//   in: query
	//   description: Getirilecek bildirim sayısı limiti
	//   type: integer
	// - name: offset
	//   in: query
	//   description: Sayfalama için başlangıç offseti
	//   type: integer
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       type: array
	//       items:
	//         "$ref": "#/definitions/Notification"
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)
	query := r.URL.Query()
	
	limitStr := query.Get("limit")
	offsetStr := query.Get("offset")
	
	limit := 50 // varsayılan limit
	if limitStr != "" {
		var err error
		limit, err = strconv.Atoi(limitStr)
		if err != nil {
			a.errorResponse(w, r, model.NewErrBadRequest(err.Error()))
			return
		}
	}
	
	offset := 0 // varsayılan offset
	if offsetStr != "" {
		var err error
		offset, err = strconv.Atoi(offsetStr)
		if err != nil {
			a.errorResponse(w, r, model.NewErrBadRequest(err.Error()))
			return
		}
	}
	
	notifications, err := a.app.GetNotificationsForUser(userID, limit, offset)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	data, err := json.Marshal(notifications)
	if err != nil {
		a.errorResponse(w, r, model.NewErrInternalServer("failed to marshal notifications"))
		return
	}
	
	jsonBytesResponse(w, http.StatusOK, data)
}

// handleGetUnreadNotificationsCount kullanıcının okunmamış bildirim sayısını döndürür
func (a *API) handleGetUnreadNotificationsCount(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /notifications/unread_count getUnreadNotificationsCount
	//
	// Kullanıcının okunmamış bildirim sayısını döndürür
	//
	// ---
	// produces:
	// - application/json
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       type: object
	//       properties:
	//         count:
	//           type: integer
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)
	
	count, err := a.app.GetUnreadNotificationsCount(userID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	data := map[string]int{
		"count": count,
	}
	
	jsonData, err := json.Marshal(data)
	if err != nil {
		a.errorResponse(w, r, model.NewErrInternalServer("failed to marshal count"))
		return
	}
	
	jsonBytesResponse(w, http.StatusOK, jsonData)
}

// handleGetNotification bildirim detayını getirir
func (a *API) handleGetNotification(w http.ResponseWriter, r *http.Request) {
	// swagger:operation GET /notifications/{notificationID} getNotification
	//
	// Bildirim detayını getirir
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: notificationID
	//   in: path
	//   description: Bildirim ID
	//   required: true
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//     schema:
	//       "$ref": "#/definitions/Notification"
	//   '404':
	//     description: Bildirim bulunamadı
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	vars := mux.Vars(r)
	notificationID := vars["notificationID"]
	userID := getUserID(r)
	
	notification, err := a.app.GetNotification(notificationID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	if notification == nil {
		a.errorResponse(w, r, model.NewErrNotFound("notification not found"))
		return
	}
	
	// Kullanıcının sadece kendi bildirimlerine erişmesine izin ver
	if notification.UserID != userID {
		a.errorResponse(w, r, model.NewErrPermission("user doesn't have permission to this notification"))
		return
	}
	
	data, err := json.Marshal(notification)
	if err != nil {
		a.errorResponse(w, r, model.NewErrInternalServer("failed to marshal notification"))
		return
	}
	
	jsonBytesResponse(w, http.StatusOK, data)
}

// handleMarkNotificationAsRead bildirimi okundu olarak işaretler
func (a *API) handleMarkNotificationAsRead(w http.ResponseWriter, r *http.Request) {
	// swagger:operation PUT /notifications/{notificationID}/read markNotificationAsRead
	//
	// Bildirimi okundu olarak işaretler
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: notificationID
	//   in: path
	//   description: Bildirim ID
	//   required: true
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//   '404':
	//     description: Bildirim bulunamadı
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	vars := mux.Vars(r)
	notificationID := vars["notificationID"]
	userID := getUserID(r)
	
	notification, err := a.app.GetNotification(notificationID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	if notification == nil {
		a.errorResponse(w, r, model.NewErrNotFound("notification not found"))
		return
	}
	
	// Kullanıcının sadece kendi bildirimlerini güncellemesine izin ver
	if notification.UserID != userID {
		a.errorResponse(w, r, model.NewErrPermission("user doesn't have permission to this notification"))
		return
	}
	
	err = a.app.MarkNotificationAsRead(notificationID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	jsonStringResponse(w, http.StatusOK, "{}")
}

// handleMarkAllNotificationsAsRead tüm bildirimleri okundu olarak işaretler
func (a *API) handleMarkAllNotificationsAsRead(w http.ResponseWriter, r *http.Request) {
	// swagger:operation PUT /notifications/mark_all_as_read markAllNotificationsAsRead
	//
	// Tüm bildirimleri okundu olarak işaretler
	//
	// ---
	// produces:
	// - application/json
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)
	
	err := a.app.MarkAllNotificationsAsRead(userID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	jsonStringResponse(w, http.StatusOK, "{}")
}

// handleDeleteNotification bildirimi siler
func (a *API) handleDeleteNotification(w http.ResponseWriter, r *http.Request) {
	// swagger:operation DELETE /notifications/{notificationID} deleteNotification
	//
	// Bildirimi siler
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: notificationID
	//   in: path
	//   description: Bildirim ID
	//   required: true
	//   type: string
	// security:
	// - BearerAuth: []
	// responses:
	//   '200':
	//     description: success
	//   '404':
	//     description: Bildirim bulunamadı
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	vars := mux.Vars(r)
	notificationID := vars["notificationID"]
	userID := getUserID(r)
	
	notification, err := a.app.GetNotification(notificationID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	if notification == nil {
		a.errorResponse(w, r, model.NewErrNotFound("notification not found"))
		return
	}
	
	// Kullanıcının sadece kendi bildirimlerini silmesine izin ver
	if notification.UserID != userID {
		a.errorResponse(w, r, model.NewErrPermission("user doesn't have permission to this notification"))
		return
	}
	
	auditRec := a.makeAuditRecord(r, "deleteNotification", audit.Fail)
	defer a.audit.LogRecord(audit.LevelRead, auditRec)
	auditRec.AddMeta("notificationID", notificationID)
	
	err = a.app.DeleteNotification(notificationID)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	auditRec.Success()
	jsonStringResponse(w, http.StatusOK, "{}")
}

// handleCreateNotification yeni bir bildirim oluşturur
func (a *API) handleCreateNotification(w http.ResponseWriter, r *http.Request) {
	// swagger:operation POST /notifications createNotification
	//
	// Yeni bir bildirim oluşturur
	//
	// ---
	// produces:
	// - application/json
	// parameters:
	// - name: body
	//   in: body
	//   description: Bildirim içeriği
	//   required: true
	//   schema:
	//     type: object
	//     required:
	//       - message
	//       - from
	//     properties:
	//       message:
	//         type: string
	//       from:
	//         type: string
	//       link:
	//         type: string
	//       boardID:
	//         type: string
	//       cardID:
	//         type: string
	//       read:
	//         type: boolean
	// security:
	// - BearerAuth: []
	// responses:
	//   '201':
	//     description: Bildirim oluşturuldu
	//     schema:
	//       "$ref": "#/definitions/Notification"
	//   default:
	//     description: internal error
	//     schema:
	//       "$ref": "#/definitions/ErrorResponse"

	userID := getUserID(r)
	
	requestBody, err := model.NotificationFromJSON(r.Body)
	if err != nil {
		a.errorResponse(w, r, model.NewErrBadRequest("cannot parse request body"))
		return
	}
	
	// Basit validation
	if requestBody.Message == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("message is required"))
		return
	}
	if requestBody.From == "" {
		a.errorResponse(w, r, model.NewErrBadRequest("from is required"))
		return
	}
	
	// Yeni bildirim oluştur
	notification := &model.Notification{
		UserID:   userID,
		Message:  requestBody.Message,
		From:     requestBody.From,
		CreateAt: model.GetMillis(),
		Read:     requestBody.Read,
		Link:     requestBody.Link,
		BoardID:  requestBody.BoardID,
		CardID:   requestBody.CardID,
	}
	
	auditRec := a.makeAuditRecord(r, "createNotification", audit.Fail)
	defer a.audit.LogRecord(audit.LevelModify, auditRec)
	
	newNotification, err := a.app.CreateNotification(notification)
	if err != nil {
		a.errorResponse(w, r, err)
		return
	}
	
	auditRec.Success()
	
	data, err := json.Marshal(newNotification)
	if err != nil {
		a.errorResponse(w, r, model.NewErrInternalServer("failed to marshal notification"))
		return
	}
	
	jsonBytesResponse(w, http.StatusCreated, data)
} 