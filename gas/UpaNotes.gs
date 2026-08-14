/**
 * ============================================
 * UpaNotes.gs - UPA Notes (UNOTE) CRUD
 * ============================================
 * Catatan/arsip untuk pembina tentang kegiatan UPA.
 * Sheet: upa_notes
 */

/**
 * Setup upa_notes sheet with headers
 */
function setupUpaNotesSheet(ss) {
  if (!ss) ss = getSpreadsheet();
  var headers = [
    'note_id', 'user_id', 'title', 'content',
    'category', 'is_pinned', 'created_at', 'updated_at'
  ];
  createSheetIfNotExists(ss, 'upa_notes', headers);
}

/**
 * Get all notes for a user (pembina)
 */
function getUpaNotes(userId) {
  if (!userId) return { error: 'userId diperlukan' };

  var sheet = getSheet('upa_notes');
  if (sheet.getLastRow() <= 1) {
    return { notes: [] };
  }

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var userIdCol = headers.indexOf('user_id');
  var notes = [];

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][userIdCol] === userId) {
      var note = {};
      for (var j = 0; j < headers.length; j++) {
        note[headers[j]] = allData[i][j];
      }
      // Parse is_pinned
      note.is_pinned = note.is_pinned === true || note.is_pinned === 1 || note.is_pinned === '1' || note.is_pinned === 'true';
      notes.push(note);
    }
  }

  // Sort: pinned first, then by updated_at desc
  notes.sort(function(a, b) {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    var dateA = new Date(a.updated_at || a.created_at);
    var dateB = new Date(b.updated_at || b.created_at);
    return dateB - dateA;
  });

  return { notes: notes };
}

/**
 * Save (create or update) a note
 * data: { userId, noteId?, title, content, category?, isPinned? }
 */
function saveUpaNote(data) {
  if (!data.userId) return { error: 'userId diperlukan' };
  if (!data.title || !data.title.trim()) return { error: 'Judul catatan diperlukan' };

  var sheet = getSheet('upa_notes');

  // Setup sheet if needed
  if (sheet.getLastRow() === 0) {
    setupUpaNotesSheet();
    sheet = getSheet('upa_notes');
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var now = new Date().toISOString();

  if (data.noteId) {
    // Update existing note
    var allData = sheet.getDataRange().getValues();
    var noteIdCol = headers.indexOf('note_id');

    for (var i = 1; i < allData.length; i++) {
      if (allData[i][noteIdCol] === data.noteId) {
        var rowIdx = i + 1;
        setColInSheet(sheet, headers, rowIdx, 'title', data.title.trim());
        setColInSheet(sheet, headers, rowIdx, 'content', data.content || '');
        setColInSheet(sheet, headers, rowIdx, 'category', data.category || 'umum');
        setColInSheet(sheet, headers, rowIdx, 'is_pinned', data.isPinned ? 1 : 0);
        setColInSheet(sheet, headers, rowIdx, 'updated_at', now);
        return { message: 'Catatan berhasil diperbarui', noteId: data.noteId };
      }
    }
    return { error: 'Catatan tidak ditemukan' };
  } else {
    // Create new note
    var noteId = 'note_' + data.userId + '_' + Date.now();
    var row = new Array(headers.length).fill('');

    setCol(row, headers, 'note_id', noteId);
    setCol(row, headers, 'user_id', data.userId);
    setCol(row, headers, 'title', data.title.trim());
    setCol(row, headers, 'content', data.content || '');
    setCol(row, headers, 'category', data.category || 'umum');
    setCol(row, headers, 'is_pinned', data.isPinned ? 1 : 0);
    setCol(row, headers, 'created_at', now);
    setCol(row, headers, 'updated_at', now);

    sheet.appendRow(row);
    return { message: 'Catatan berhasil dibuat', noteId: noteId };
  }
}

/**
 * Delete a note
 * data: { userId, noteId }
 */
function deleteUpaNote(data) {
  if (!data.userId || !data.noteId) return { error: 'userId dan noteId diperlukan' };

  var sheet = getSheet('upa_notes');
  if (sheet.getLastRow() <= 1) return { error: 'Catatan tidak ditemukan' };

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var noteIdCol = headers.indexOf('note_id');
  var userIdCol = headers.indexOf('user_id');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][noteIdCol] === data.noteId && allData[i][userIdCol] === data.userId) {
      sheet.deleteRow(i + 1);
      return { message: 'Catatan berhasil dihapus' };
    }
  }

  return { error: 'Catatan tidak ditemukan' };
}

/**
 * Helper to set a cell value in-place by column name
 */
function setColInSheet(sheet, headers, rowNum, colName, value) {
  var idx = headers.indexOf(colName);
  if (idx >= 0) {
    sheet.getRange(rowNum, idx + 1).setValue(value);
  }
}
