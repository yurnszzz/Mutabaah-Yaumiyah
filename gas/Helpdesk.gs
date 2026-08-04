/**
 * ============================================
 * Helpdesk.gs - Ticketing System
 * ============================================
 * 
 * Sheets:
 *   tickets: ticket_id, user_id, user_nama, user_email, user_role, 
 *            kategori, subjek, deskripsi, prioritas, status,
 *            created_at, updated_at, resolved_at, resolved_by
 *   ticket_replies: reply_id, ticket_id, user_id, user_nama, user_role,
 *                   pesan, created_at
 */

// ============ SHEET SETUP ============

var TICKET_HEADERS = [
  'ticket_id', 'user_id', 'user_nama', 'user_email', 'user_role',
  'kategori', 'subjek', 'deskripsi', 'prioritas', 'status',
  'created_at', 'updated_at', 'resolved_at', 'resolved_by'
];

var REPLY_HEADERS = [
  'reply_id', 'ticket_id', 'user_id', 'user_nama', 'user_role',
  'pesan', 'created_at'
];

function ensureTicketSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  var ticketSheet = ss.getSheetByName('tickets');
  if (!ticketSheet) {
    ticketSheet = ss.insertSheet('tickets');
    ticketSheet.appendRow(TICKET_HEADERS);
    ticketSheet.setFrozenRows(1);
    ticketSheet.getRange(1, 1, 1, TICKET_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
  }
  
  var replySheet = ss.getSheetByName('ticket_replies');
  if (!replySheet) {
    replySheet = ss.insertSheet('ticket_replies');
    replySheet.appendRow(REPLY_HEADERS);
    replySheet.setFrozenRows(1);
    replySheet.getRange(1, 1, 1, REPLY_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
  }
}

// ============ TICKET CRUD ============

/**
 * Create a new support ticket
 * @param {Object} data - { userId, userNama, userEmail, userRole, kategori, subjek, deskripsi, prioritas }
 */
function createTicket(data) {
  if (!data.userId || !data.subjek || !data.deskripsi) {
    return { error: 'UserId, subjek, dan deskripsi diperlukan' };
  }
  
  ensureTicketSheets();
  
  var ticketId = 'TKT-' + new Date().getFullYear() + '-' + 
    String(new Date().getMonth() + 1).padStart(2, '0') + '-' +
    Utilities.getUuid().substring(0, 6).toUpperCase();
  var now = new Date().toISOString();
  
  var sheet = getSheet('tickets');
  sheet.appendRow([
    ticketId,
    data.userId,
    data.userNama || '',
    data.userEmail || '',
    data.userRole || 'anggota',
    data.kategori || 'umum',
    data.subjek,
    data.deskripsi,
    data.prioritas || 'sedang',
    'baru',             // status default
    now,                // created_at
    now,                // updated_at
    '',                 // resolved_at
    ''                  // resolved_by
  ]);
  
  return { 
    success: true, 
    message: 'Tiket berhasil dibuat',
    ticketId: ticketId 
  };
}

/**
 * Get tickets for a specific user (anggota/pembina)
 * @param {string} userId
 */
function getMyTickets(userId) {
  if (!userId) return { error: 'userId diperlukan' };
  
  ensureTicketSheets();
  
  var sheet = getSheet('tickets');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var userIdCol = headers.indexOf('user_id');
  
  var tickets = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][userIdCol] === userId) {
      tickets.push(rowToObject(headers, data[i]));
    }
  }
  
  // Sort by created_at desc (newest first)
  tickets.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
  
  // Count replies per ticket
  var replySheet = getSheet('ticket_replies');
  var replyData = replySheet.getDataRange().getValues();
  var replyHeaders = replyData[0];
  var replyTicketCol = replyHeaders.indexOf('ticket_id');
  
  var replyCounts = {};
  for (var i = 1; i < replyData.length; i++) {
    var tid = replyData[i][replyTicketCol];
    replyCounts[tid] = (replyCounts[tid] || 0) + 1;
  }
  
  tickets.forEach(function(t) {
    t.jumlah_balasan = replyCounts[t.ticket_id] || 0;
  });
  
  return { tickets: tickets, total: tickets.length };
}

/**
 * Get ALL tickets (for admin/yayasan)
 * Supports optional status filter
 * @param {string} statusFilter - optional: 'baru', 'diproses', 'selesai', 'ditutup'
 */
function getAllTickets(statusFilter) {
  ensureTicketSheets();
  
  var sheet = getSheet('tickets');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var statusCol = headers.indexOf('status');
  
  var tickets = [];
  for (var i = 1; i < data.length; i++) {
    var row = rowToObject(headers, data[i]);
    if (!statusFilter || row.status === statusFilter) {
      tickets.push(row);
    }
  }
  
  // Sort: baru first, then diproses, then by date desc
  var statusOrder = { 'baru': 0, 'diproses': 1, 'selesai': 2, 'ditutup': 3 };
  tickets.sort(function(a, b) {
    var sa = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 9;
    var sb = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 9;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at) - new Date(a.created_at);
  });
  
  // Count replies per ticket
  var replySheet = getSheet('ticket_replies');
  var replyData = replySheet.getDataRange().getValues();
  var replyHeaders = replyData[0];
  var replyTicketCol = replyHeaders.indexOf('ticket_id');
  
  var replyCounts = {};
  for (var i = 1; i < replyData.length; i++) {
    var tid = replyData[i][replyTicketCol];
    replyCounts[tid] = (replyCounts[tid] || 0) + 1;
  }
  
  tickets.forEach(function(t) {
    t.jumlah_balasan = replyCounts[t.ticket_id] || 0;
  });
  
  // Stats
  var stats = { baru: 0, diproses: 0, selesai: 0, ditutup: 0, total: 0 };
  for (var i = 1; i < data.length; i++) {
    var s = (data[i][statusCol] || '').toString();
    if (stats[s] !== undefined) stats[s]++;
    stats.total++;
  }
  
  return { tickets: tickets, stats: stats };
}

/**
 * Get ticket detail with all replies
 * @param {string} ticketId
 * @param {string} userId - requesting user (for auth check)
 * @param {string} userRole - requesting user role
 */
function getTicketDetail(ticketId, userId, userRole) {
  if (!ticketId) return { error: 'ticketId diperlukan' };
  
  ensureTicketSheets();
  
  // Find ticket
  var sheet = getSheet('tickets');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var ticketIdCol = headers.indexOf('ticket_id');
  
  var ticket = null;
  for (var i = 1; i < data.length; i++) {
    if (data[i][ticketIdCol] === ticketId) {
      ticket = rowToObject(headers, data[i]);
      break;
    }
  }
  
  if (!ticket) return { error: 'Tiket tidak ditemukan' };
  
  // Auth check: user can only see own tickets, admin/pembina can see all
  if (userRole !== 'yayasan' && userRole !== 'pembina' && ticket.user_id !== userId) {
    return { error: 'Anda tidak memiliki akses ke tiket ini' };
  }
  
  // Get replies
  var replySheet = getSheet('ticket_replies');
  var replyData = replySheet.getDataRange().getValues();
  var replyHeaders = replyData[0];
  var replyTicketCol = replyHeaders.indexOf('ticket_id');
  
  var replies = [];
  for (var i = 1; i < replyData.length; i++) {
    if (replyData[i][replyTicketCol] === ticketId) {
      replies.push(rowToObject(replyHeaders, replyData[i]));
    }
  }
  
  // Sort replies by date asc (oldest first - chat order)
  replies.sort(function(a, b) {
    return new Date(a.created_at) - new Date(b.created_at);
  });
  
  return { ticket: ticket, replies: replies };
}

/**
 * Add a reply to a ticket
 * @param {Object} data - { ticketId, userId, userNama, userRole, pesan }
 */
function replyTicket(data) {
  if (!data.ticketId || !data.userId || !data.pesan) {
    return { error: 'ticketId, userId, dan pesan diperlukan' };
  }
  
  ensureTicketSheets();
  
  var replyId = 'RPL-' + Utilities.getUuid().substring(0, 8);
  var now = new Date().toISOString();
  
  var replySheet = getSheet('ticket_replies');
  replySheet.appendRow([
    replyId,
    data.ticketId,
    data.userId,
    data.userNama || '',
    data.userRole || 'anggota',
    data.pesan,
    now
  ]);
  
  // Update ticket's updated_at
  var ticketSheet = getSheet('tickets');
  var ticketData = ticketSheet.getDataRange().getValues();
  var ticketHeaders = ticketData[0];
  var ticketIdCol = ticketHeaders.indexOf('ticket_id');
  var updatedAtCol = ticketHeaders.indexOf('updated_at');
  var statusCol = ticketHeaders.indexOf('status');
  
  for (var i = 1; i < ticketData.length; i++) {
    if (ticketData[i][ticketIdCol] === data.ticketId) {
      ticketSheet.getRange(i + 1, updatedAtCol + 1).setValue(now);
      // If admin replies to a 'baru' ticket, auto-change to 'diproses'
      if (data.userRole === 'yayasan' && ticketData[i][statusCol] === 'baru') {
        ticketSheet.getRange(i + 1, statusCol + 1).setValue('diproses');
      }
      break;
    }
  }
  
  return { success: true, message: 'Balasan berhasil dikirim', replyId: replyId };
}

/**
 * Update ticket status (admin only)
 * @param {Object} data - { ticketId, status, resolvedBy }
 */
function updateTicketStatus(data) {
  if (!data.ticketId || !data.status) {
    return { error: 'ticketId dan status diperlukan' };
  }
  
  var validStatuses = ['baru', 'diproses', 'selesai', 'ditutup'];
  if (validStatuses.indexOf(data.status) === -1) {
    return { error: 'Status tidak valid. Gunakan: ' + validStatuses.join(', ') };
  }
  
  ensureTicketSheets();
  
  var sheet = getSheet('tickets');
  var sheetData = sheet.getDataRange().getValues();
  var headers = sheetData[0];
  var ticketIdCol = headers.indexOf('ticket_id');
  var statusCol = headers.indexOf('status');
  var updatedAtCol = headers.indexOf('updated_at');
  var resolvedAtCol = headers.indexOf('resolved_at');
  var resolvedByCol = headers.indexOf('resolved_by');
  
  var now = new Date().toISOString();
  
  for (var i = 1; i < sheetData.length; i++) {
    if (sheetData[i][ticketIdCol] === data.ticketId) {
      sheet.getRange(i + 1, statusCol + 1).setValue(data.status);
      sheet.getRange(i + 1, updatedAtCol + 1).setValue(now);
      
      if (data.status === 'selesai' || data.status === 'ditutup') {
        sheet.getRange(i + 1, resolvedAtCol + 1).setValue(now);
        sheet.getRange(i + 1, resolvedByCol + 1).setValue(data.resolvedBy || '');
      }
      
      return { success: true, message: 'Status tiket diperbarui menjadi "' + data.status + '"' };
    }
  }
  
  return { error: 'Tiket tidak ditemukan' };
}

/**
 * Get helpdesk stats (for admin dashboard)
 */
function getHelpdeskStats() {
  ensureTicketSheets();
  
  var sheet = getSheet('tickets');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var statusCol = headers.indexOf('status');
  var prioritasCol = headers.indexOf('prioritas');
  var kategoriCol = headers.indexOf('kategori');
  var createdAtCol = headers.indexOf('created_at');
  var resolvedAtCol = headers.indexOf('resolved_at');
  
  var stats = {
    total: 0,
    baru: 0,
    diproses: 0,
    selesai: 0,
    ditutup: 0,
    byPrioritas: { rendah: 0, sedang: 0, tinggi: 0, urgent: 0 },
    byKategori: {},
    avgResolutionHours: 0
  };
  
  var resolutionTimes = [];
  
  for (var i = 1; i < data.length; i++) {
    stats.total++;
    var status = (data[i][statusCol] || '').toString();
    if (stats[status] !== undefined) stats[status]++;
    
    var pri = (data[i][prioritasCol] || 'sedang').toString();
    if (stats.byPrioritas[pri] !== undefined) stats.byPrioritas[pri]++;
    
    var kat = (data[i][kategoriCol] || 'umum').toString();
    stats.byKategori[kat] = (stats.byKategori[kat] || 0) + 1;
    
    // Calculate resolution time
    if (data[i][resolvedAtCol] && data[i][createdAtCol]) {
      var created = new Date(data[i][createdAtCol]);
      var resolved = new Date(data[i][resolvedAtCol]);
      var hours = (resolved - created) / (1000 * 60 * 60);
      resolutionTimes.push(hours);
    }
  }
  
  if (resolutionTimes.length > 0) {
    stats.avgResolutionHours = Math.round(
      resolutionTimes.reduce(function(s, h) { return s + h; }, 0) / resolutionTimes.length
    );
  }
  
  return stats;
}
