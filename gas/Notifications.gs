/**
 * ============================================
 * Notifications.gs - In-App Notification System
 * ============================================
 * Sheet: notifications
 * Columns: notif_id, user_id, type, title, message, is_read, created_at
 */

/**
 * Setup notifications sheet
 */
function setupNotificationsSheet(ss) {
  if (!ss) ss = getSpreadsheet();
  var headers = [
    'notif_id', 'user_id', 'type', 'title', 'message', 'is_read', 'created_at'
  ];
  createSheetIfNotExists(ss, 'notifications', headers);
}

/**
 * Create a notification for a specific user
 * type: 'approval', 'rejection', 'profile_update', 'reminder', 'info'
 */
function createNotification(userId, type, title, message) {
  var sheet = getSheet('notifications');
  var notifId = 'ntf_' + Utilities.getUuid().substring(0, 8);
  var now = new Date().toISOString();

  sheet.appendRow([
    notifId,
    userId,
    type,
    title,
    message,
    false,  // is_read
    now
  ]);

  return notifId;
}

/**
 * Get notifications for a user (newest first, max 50)
 */
function getNotifications(userId) {
  if (!userId) return { error: 'userId diperlukan' };

  var sheet = getSheet('notifications');
  if (sheet.getLastRow() <= 1) {
    return { notifications: [], unreadCount: 0 };
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var userIdCol = headers.indexOf('user_id');

  var notifications = [];
  var unreadCount = 0;

  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][userIdCol] === userId) {
      var notif = {};
      for (var j = 0; j < headers.length; j++) {
        notif[headers[j]] = data[i][j];
      }
      notifications.push(notif);
      if (!notif.is_read) unreadCount++;

      // Max 50 notifications
      if (notifications.length >= 50) break;
    }
  }

  return { notifications: notifications, unreadCount: unreadCount };
}

/**
 * Mark notification(s) as read
 */
function markNotificationsRead(data) {
  if (!data.userId) return { error: 'userId diperlukan' };

  var sheet = getSheet('notifications');
  if (sheet.getLastRow() <= 1) return { message: 'OK' };

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var userIdCol = headers.indexOf('user_id');
  var readCol = headers.indexOf('is_read');
  var idCol = headers.indexOf('notif_id');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][userIdCol] === data.userId) {
      // If specific notifId provided, only mark that one
      if (data.notifId && allData[i][idCol] !== data.notifId) continue;

      if (!allData[i][readCol]) {
        sheet.getRange(i + 1, readCol + 1).setValue(true);
      }
    }
  }

  return { message: 'Notifikasi ditandai sudah dibaca' };
}
