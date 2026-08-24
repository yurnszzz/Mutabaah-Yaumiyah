/**
 * ============================================
 * MUTABAAH YAUMIYAH - Google Apps Script Backend
 * Main Router (Code.gs)
 * ============================================
 * 
 * Deploy sebagai Web App:
 * - Execute as: Me (pemilik spreadsheet)
 * - Who has access: Anyone
 * 
 * SETUP:
 * 1. Buat Google Spreadsheet baru, beri nama "mutabaah_db"
 * 2. Copy SPREADSHEET_ID dari URL spreadsheet
 * 3. Paste di variable SPREADSHEET_ID di bawah
 * 4. Jalankan function setupDatabase() sekali untuk membuat sheet-sheet
 * 5. Deploy sebagai Web App
 * 6. Copy URL Web App, paste di frontend .env sebagai VITE_GAS_URL
 */

// ============ KONFIGURASI ============
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // GANTI DENGAN ID SPREADSHEET ANDA
const CACHE_DURATION = 21600; // 6 jam dalam detik

// ============ ROUTER ============

/**
 * Handle GET requests
 * URL Pattern: ?action=xxx&param1=yyy
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;

    let result;

    switch (action) {
      // Auth (Google OAuth - no password in URL)
      case 'login':
        result = loginGoogle(params.email);
        break;
      case 'getUser':
        result = getUserById(params.userId);
        break;

      // Mutabaah
      case 'getCurrentWeek':
        result = getCurrentWeekData(params.userId, params.tahun, params.pekan);
        break;
      case 'getHistory':
        result = getHistory(params.userId, params.tahun, parseInt(params.limit || '10'), parseInt(params.offset || '0'));
        break;

      // Dashboard
      case 'getDashboard':
        result = getDashboardData(params.userId);
        break;

      // Pembina
      case 'getGrupRekap':
        result = getGrupRekap(params.grupId, params.tahun, params.pekan);
        break;
      case 'getGrupAnggota':
        result = getGrupAnggota(params.grupId);
        break;
      case 'getPembinaGroups':
        result = getPembinaGroups(params.pembinaUserId);
        break;

      // Yayasan
      case 'getAllGrupRekap':
        result = getAllGrupRekap(params.tahun, params.pekan);
        break;
      case 'getAllUsers':
        result = getAllUsers();
        break;
      case 'getAllGroups':
        result = getAllGroups();
        break;
      case 'getAdminStats':
        result = getAdminStats();
        break;

      // Helpdesk
      case 'getMyTickets':
        result = getMyTickets(e.parameter.userId);
        break;
      case 'getAllTickets':
        result = getAllTickets(e.parameter.status || '');
        break;
      case 'getTicketDetail':
        result = getTicketDetail(e.parameter.ticketId, e.parameter.userId, e.parameter.userRole);
        break;
      case 'getHelpdeskStats':
        result = getHelpdeskStats();
        break;

      // B6: Pembina drill-down
      case 'getMemberMutabaah':
        result = getMemberMutabaah(
          params.pembinaUserId, params.memberUserId,
          params.tahun, parseInt(params.limit || '20'), parseInt(params.offset || '0')
        );
        break;

      // C1: Leaderboard
      case 'getLeaderboard':
        result = getLeaderboard(params.mode, params.tahun, params.pekan);
        break;

      // C2: Rapor Bulanan
      case 'getMonthlyReport':
        result = getMonthlyReport(params.userId, parseInt(params.bulan), parseInt(params.tahun));
        break;

      // UPA Notes
      case 'getUpaNotes':
        result = getUpaNotes(params.userId);
        break;

      // Pending Users
      case 'getPendingUsers':
        result = getPendingUsers(params.grupId || '');
        break;

      // Notifications
      case 'getNotifications':
        result = getNotifications(params.userId);
        break;

      default:
        result = { error: 'Action tidak dikenal: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack }, 500);
  }
}

/**
 * Handle POST requests
 * Body: JSON { action, data }
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const data = body.data;

    let result;

    switch (action) {
      // Mutabaah
      case 'submitMutabaah':
        result = submitMutabaah(data);
        break;
      case 'resetWeek':
        result = resetWeekData(data.userId, data.tahun, data.pekan);
        break;

      // Auth (manual login with password - POST for security)
      case 'loginManual':
        result = loginUser(data.email, data.password);
        break;

      // User management
      case 'createUser':
        result = createUser(data);
        break;
      case 'updateUser':
        result = updateUser(data);
        break;
      case 'register':
        result = registerSelf(data);
        break;
      case 'changePassword':
        result = changePassword(data);
        break;
      case 'resetPassword':
        result = resetPassword(data);
        break;

      // Admin
      case 'deleteUser':
        result = deleteUser(data);
        break;
      case 'updateUserRole':
        result = updateUserRole(data);
        break;
      case 'updateProfile':
        result = updateProfile(data);
        break;
      case 'adminEditProfile':
        result = adminEditProfile(data);
        break;
      case 'approvePendingUser':
        result = approvePendingUser(data);
        break;
      case 'rejectPendingUser':
        result = rejectPendingUser(data);
        break;
      case 'markNotificationsRead':
        result = markNotificationsRead(data);
        break;

      // Helpdesk
      case 'createTicket':
        result = createTicket(data);
        break;
      case 'replyTicket':
        result = replyTicket(data);
        break;
      case 'updateTicketStatus':
        result = updateTicketStatus(data);
        break;

      // Group Management
      case 'createGroup':
        result = createGroup(data);
        break;
      case 'updateGroup':
        result = updateGroup(data);
        break;
      case 'deleteGroup':
        result = deleteGroup(data);
        break;
      case 'addMemberToGroup':
        result = addMemberToGroup(data);
        break;
      case 'removeMemberFromGroup':
        result = removeMemberFromGroup(data);
        break;

      // UPA Notes
      case 'saveUpaNote':
        result = saveUpaNote(data);
        break;
      case 'deleteUpaNote':
        result = deleteUpaNote(data);
        break;

      default:
        result = { error: 'Action tidak dikenal: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack }, 500);
  }
}

// ============ RESPONSE HELPER ============

function jsonResponse(data, code) {
  const output = ContentService.createTextOutput(JSON.stringify({
    success: !data.error,
    timestamp: new Date().toISOString(),
    ...data,
  }));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============ SPREADSHEET ACCESS ============

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  // Auto-ensure headers for critical sheets
  if (name === 'users') ensureUserHeaders(sheet);
  if (name === 'groups') ensureGroupHeaders(sheet);
  return sheet;
}

/**
 * Ensure the users sheet has proper headers (including gender).
 * Critical: without headers, rowToObject and appendRow produce garbage data.
 */
function ensureUserHeaders(usersSheet) {
  var expectedHeaders = [
    'user_id', 'email', 'password_hash', 'nama', 'role', 'tingkatan',
    'grup_id', 'status', 'transisi_dari', 'transisi_mulai',
    'transisi_durasi_pekan', 'streak_current', 'streak_longest',
    'badges', 'no_whatsapp', 'created_at', 'gender'
  ];
  if (usersSheet.getLastRow() === 0) {
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    usersSheet.setFrozenRows(1);
    return;
  }
  var firstRow = usersSheet.getRange(1, 1, 1, Math.max(usersSheet.getLastColumn(), expectedHeaders.length)).getValues()[0];
  if (firstRow[0] !== 'user_id') {
    usersSheet.insertRowBefore(1);
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    usersSheet.setFrozenRows(1);
  } else {
    // Check if gender column exists, add if missing
    var genderIdx = firstRow.indexOf('gender');
    if (genderIdx === -1) {
      var nextCol = usersSheet.getLastColumn() + 1;
      usersSheet.getRange(1, nextCol).setValue('gender').setFontWeight('bold');
      Logger.log('Added missing "gender" column at position ' + nextCol);
    }
  }
}

// ============ DATABASE SETUP ============

// Tab colors for visual organization
var TAB_COLORS = {
  users: '#4285F4',          // Blue - core data
  groups: '#4285F4',         // Blue - core data
  mutabaah: '#34A853',       // Green - daily tracking
  rekap_mingguan: '#FBBC04', // Yellow - reports
  rapor_bulanan: '#FBBC04',  // Yellow - reports
  helpdesk: '#EA4335',       // Red - support
  arsip: '#9E9E9E',          // Gray - archive
};

/**
 * ============================================
 * MIGRASI: Tambah kolom haid + sheet upa_notes
 * ============================================
 * Jalankan SEKALI setelah update kode.
 * AMAN: Tidak menghapus atau mengubah data existing.
 * 
 * Menu: Run > migrateAddHaidColumns
 */
function migrateAddHaidColumns() {
  var ss = getSpreadsheet();
  var sheets = ss.getSheets();
  var migrated = [];

  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    
    // Only process mutabaah_YYYY sheets
    if (name.indexOf('mutabaah_') !== 0) continue;
    
    var sheet = sheets[i];
    if (sheet.getLastRow() === 0) continue; // empty sheet, skip
    
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colsAdded = [];
    
    // Check if hari_haid column already exists
    if (headers.indexOf('hari_haid') === -1) {
      // Insert after terlambat_upa_menit (or at end if not found)
      var insertAfter = headers.indexOf('terlambat_upa_menit');
      if (insertAfter === -1) insertAfter = headers.indexOf('persen_sholat_fardu');
      if (insertAfter === -1) insertAfter = headers.length - 1;
      
      var insertCol = insertAfter + 2; // 1-indexed, after the target column
      
      // Insert 2 new columns
      sheet.insertColumnAfter(insertAfter + 1);
      sheet.insertColumnAfter(insertAfter + 1);
      
      // Set headers
      sheet.getRange(1, insertCol).setValue('hari_haid');
      sheet.getRange(1, insertCol).setFontWeight('bold');
      sheet.getRange(1, insertCol).setBackground('#f3f4f6');
      
      sheet.getRange(1, insertCol + 1).setValue('hari_haid_count');
      sheet.getRange(1, insertCol + 1).setFontWeight('bold');
      sheet.getRange(1, insertCol + 1).setBackground('#f3f4f6');
      
      // Fill existing rows with defaults (empty string and 0)
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        var emptyRange = sheet.getRange(2, insertCol, lastRow - 1, 1);
        var zeroRange = sheet.getRange(2, insertCol + 1, lastRow - 1, 1);
        var emptyVals = [];
        var zeroVals = [];
        for (var r = 0; r < lastRow - 1; r++) {
          emptyVals.push(['']);
          zeroVals.push([0]);
        }
        emptyRange.setValues(emptyVals);
        zeroRange.setValues(zeroVals);
      }
      
      colsAdded.push('hari_haid', 'hari_haid_count');
    }
    
    if (colsAdded.length > 0) {
      migrated.push(name + ' (+' + colsAdded.join(', ') + ')');
      Logger.log('Migrasi ' + name + ': Kolom ' + colsAdded.join(', ') + ' ditambahkan.');
    } else {
      Logger.log('Sheet ' + name + ': Kolom haid sudah ada, skip.');
    }
  }
  
  // Also ensure upa_notes and notifications sheets exist
  setupUpaNotesSheet(ss);
  setupNotificationsSheet(ss);
  
  Logger.log('');
  Logger.log('========================================');
  Logger.log('Migrasi selesai!');
  Logger.log('========================================');
  if (migrated.length > 0) {
    Logger.log('Sheet yang dimigrasi: ' + migrated.join(', '));
  } else {
    Logger.log('Tidak ada sheet yang perlu dimigrasi.');
  }
  Logger.log('Sheet upa_notes: OK');
  Logger.log('');
  Logger.log('Data existing TIDAK diubah. Kolom baru diisi default (kosong/0).');
}

/**
 * Jalankan fungsi ini SEKALI untuk membuat struktur database lengkap.
 * Aman dijalankan ulang — tidak menghapus data yang sudah ada.
 * 
 * Menu: Run > setupDatabase
 */
function setupDatabase() {
  var ss = getSpreadsheet();

  // 1. Sheet: users (master data user)
  createSheetIfNotExists(ss, 'users', [
    'user_id', 'email', 'password_hash', 'nama', 'role', 'tingkatan',
    'grup_id', 'status', 'transisi_dari', 'transisi_mulai',
    'transisi_durasi_pekan', 'streak_current', 'streak_longest',
    'badges', 'no_whatsapp', 'created_at', 'gender'
  ]);

  // 2. Sheet: groups (master data grup)
  createSheetIfNotExists(ss, 'groups', [
    'grup_id', 'nama_grup', 'pembina_user_id', 'created_at'
  ]);

  // 3. Sheet: mutabaah_YYYY (data input harian, per tahun)
  var tahun = new Date().getFullYear();
  setupMutabaahSheet(ss, tahun);

  // 4. Sheet: rekap_mingguan (agregasi per minggu per grup)
  createSheetIfNotExists(ss, 'rekap_mingguan', [
    'grup_id', 'pekan_ke', 'tahun', 'jumlah_anggota', 'jumlah_mengisi',
    'jumlah_terlambat', 'rata_rata_sholat_fardu', 'rata_rata_berjamaah',
    'rata_rata_sholat_dhuha', 'rata_rata_tilawah', 'rata_rata_matsurat',
    'rata_rata_shaum', 'rata_rata_qiyamullail', 'rata_rata_keseluruhan'
  ]);

  // 5. Sheet: rapor_bulanan (laporan bulanan per user)
  createSheetIfNotExists(ss, 'rapor_bulanan', [
    'rapor_id', 'user_id', 'nama', 'bulan', 'tahun', 'total_weeks',
    'rata_rata', 'predikat_label', 'predikat_level', 'summary_json',
    'week_summaries_json', 'generated_at'
  ]);

  // 6. Sheet: helpdesk_tickets (tiket bantuan)
  createSheetIfNotExists(ss, 'helpdesk_tickets', [
    'ticket_id', 'user_id', 'user_nama', 'user_email', 'kategori',
    'subjek', 'pesan', 'status', 'priority', 'created_at', 'updated_at'
  ]);

  // 7. Sheet: helpdesk_replies (balasan tiket)
  createSheetIfNotExists(ss, 'helpdesk_replies', [
    'reply_id', 'ticket_id', 'user_id', 'user_nama', 'role',
    'pesan', 'created_at'
  ]);

  // 8. Sheet: arsip_anggota (arsip user nonaktif)
  createSheetIfNotExists(ss, 'arsip_anggota', [
    'arsip_id', 'user_id', 'nama', 'grup_asal',
    'alasan', 'tanggal_arsip', 'data_json'
  ]);

  // 9. Sheet: upa_notes (catatan pembina)
  setupUpaNotesSheet(ss);

  // Apply tab colors & ordering
  cleanupSheetTabs(ss);

  // Insert sample data (only if empty)
  insertSampleData(ss);

  Logger.log('');
  Logger.log('========================================');
  Logger.log('✅ Database setup selesai!');
  Logger.log('========================================');
  Logger.log('');
  Logger.log('Sheets yang tersedia:');
  Logger.log('  📘 users          - Data user (anggota, pembina, yayasan)');
  Logger.log('  📘 groups         - Data grup halaqah');
  Logger.log('  📗 mutabaah_' + tahun + ' - Input harian tahun ' + tahun);
  Logger.log('  📙 rekap_mingguan - Agregasi per minggu');
  Logger.log('  📙 rapor_bulanan  - Laporan bulanan');
  Logger.log('  📕 helpdesk_*     - Sistem tiket bantuan');
  Logger.log('  ⬜ arsip_anggota  - Arsip user nonaktif');
  Logger.log('');
  Logger.log('Selanjutnya: Jalankan setupAdmin() untuk membuat akun admin.');
}

function setupMutabaahSheet(ss, tahun) {
  var sheetName = 'mutabaah_' + tahun;
  var HARI = ['sen', 'sel', 'rab', 'kam', 'jum', 'sab', 'min'];
  var WAKTU = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

  var sholatCols = [];
  HARI.forEach(function(h) { WAKTU.forEach(function(w) { sholatCols.push(h + '_' + w); }); });

  var jamaahCols = [];
  HARI.forEach(function(h) { WAKTU.forEach(function(w) { jamaahCols.push('jamaah_' + h + '_' + w); }); });

  var headers = [
    'record_id', 'user_id', 'grup_id', 'tingkatan',
    'pekan_ke', 'tahun', 'tanggal_mulai_pekan', 'tanggal_submit', 'is_terlambat'
  ].concat(sholatCols).concat(jamaahCols).concat([
    'tilawah_juz', 'tilawah_halaman', 'tilawah_total_juz',
    'sholat_dhuha', 'matsurat', 'shaum', 'qiyamullail',
    'kehadiran_upa', 'terlambat_upa_menit',
    'hari_haid', 'hari_haid_count',
    'persen_sholat_fardu', 'persen_berjamaah', 'persen_sholat_dhuha',
    'persen_tilawah', 'persen_matsurat', 'persen_shaum', 'persen_qiyamullail',
    'persen_rata_rata', 'status',
    'edit_count', 'last_edited_at', 'first_submitted_at'
  ]);

  createSheetIfNotExists(ss, sheetName, headers);
}

function createSheetIfNotExists(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.getRange(1, 1, 1, headers.length).setBackground('#f3f4f6');
      sheet.setFrozenRows(1);
    }
    Logger.log('✅ Sheet "' + name + '" dibuat (' + headers.length + ' kolom)');
  } else {
    Logger.log('ℹ️  Sheet "' + name + '" sudah ada, skip.');
  }
  return sheet;
}

/**
 * Rapikan urutan dan warna tab spreadsheet.
 * Bisa dijalankan kapan saja tanpa menghapus data.
 * 
 * Menu: Run > cleanupSheetTabs
 */
function cleanupSheetTabs(ss) {
  if (!ss) ss = getSpreadsheet();
  
  // Desired tab order
  var tabOrder = [
    'users', 'groups',
    'mutabaah_' + new Date().getFullYear(),
    'rekap_mingguan', 'rapor_bulanan',
    'upa_notes',
    'helpdesk_tickets', 'helpdesk_replies',
    'arsip_anggota'
  ];

  // Color mapping
  var colorMap = {
    'users': TAB_COLORS.users,
    'groups': TAB_COLORS.groups,
    'rekap_mingguan': TAB_COLORS.rekap_mingguan,
    'rapor_bulanan': TAB_COLORS.rapor_bulanan,
    'helpdesk_tickets': TAB_COLORS.helpdesk,
    'helpdesk_replies': TAB_COLORS.helpdesk,
    'upa_notes': '#7c3aed',
    'arsip_anggota': TAB_COLORS.arsip,
  };

  // Apply colors to all sheets
  var allSheets = ss.getSheets();
  for (var i = 0; i < allSheets.length; i++) {
    var sheetName = allSheets[i].getName();
    
    // Match mutabaah_YYYY pattern
    if (sheetName.indexOf('mutabaah_') === 0) {
      allSheets[i].setTabColor(TAB_COLORS.mutabaah);
    } else if (colorMap[sheetName]) {
      allSheets[i].setTabColor(colorMap[sheetName]);
    }
  }

  // Reorder tabs
  var position = 1;
  for (var j = 0; j < tabOrder.length; j++) {
    var sheet = ss.getSheetByName(tabOrder[j]);
    if (sheet) {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(position);
      position++;
    }
  }

  // Move any extra sheets (mutabaah_otherYears, etc.) after the ordered ones
  allSheets = ss.getSheets();
  for (var k = 0; k < allSheets.length; k++) {
    var sn = allSheets[k].getName();
    if (tabOrder.indexOf(sn) === -1 && sn.indexOf('mutabaah_') === 0) {
      allSheets[k].setTabColor(TAB_COLORS.mutabaah);
    }
  }

  // Activate first sheet
  var first = ss.getSheetByName('users');
  if (first) ss.setActiveSheet(first);

  Logger.log('✅ Tab dirapikan: urutan & warna diterapkan.');
}

function insertSampleData(ss) {
  // Sample groups
  var groupsSheet = ss.getSheetByName('groups');
  if (groupsSheet && groupsSheet.getLastRow() <= 1) {
    groupsSheet.appendRow(['grp_001', 'Al-Fatih', 'usr_001', new Date().toISOString()]);
    Logger.log('📦 Sample group "Al-Fatih" ditambahkan.');
  }

  // Sample users
  var usersSheet = ss.getSheetByName('users');
  if (usersSheet && usersSheet.getLastRow() <= 1) {
    var now = new Date().toISOString();
    // Pembina (tingkatan = pratama)
    usersSheet.appendRow([
      'usr_001', 'ustadz.hamdan@sit-matahari.sch.id', '', 'Ust. Hamdan',
      'pembina', 'pratama', 'grp_001', 'aktif', '', '', '', 0, 0, '[]', '', now, 'ikhwan'
    ]);
    // Yayasan / Admin (default password: admin123)
    usersSheet.appendRow([
      'usr_004', 'yayasan@sit-matahari.sch.id', hashPassword('admin123'), 'Admin Yayasan',
      'yayasan', 'pratama', '', 'aktif', '', '', '', 0, 0, '[]', '', now, 'ikhwan'
    ]);
    Logger.log('📦 Sample users ditambahkan (Pembina + Admin).');
  }
}

/**
 * ============================================
 * SETUP ADMIN ACCOUNT
 * ============================================
 * Jalankan fungsi ini untuk membuat/mereset akun Admin Yayasan.
 * 
 * Cara pakai:
 * 1. Ubah EMAIL dan PASSWORD di bawah
 * 2. Jalankan: Run > setupAdmin
 * 3. Login di web dengan email + password yang sudah diset
 */
function setupAdmin() {
  // ======= KONFIGURASI ADMIN =======
  var ADMIN_EMAIL = 'yayasan@sit-matahari.sch.id';  // GANTI DENGAN EMAIL ADMIN
  var ADMIN_PASSWORD = 'admin123';                    // GANTI DENGAN PASSWORD ADMIN
  var ADMIN_NAMA = 'Admin Yayasan';                   // GANTI DENGAN NAMA ADMIN
  // ==================================

  if (ADMIN_PASSWORD.length < 6) {
    Logger.log('ERROR: Password minimal 6 karakter!');
    return;
  }

  var sheet = getSheet('users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('email');
  var pwCol = headers.indexOf('password_hash');
  var namaCol = headers.indexOf('nama');
  var roleCol = headers.indexOf('role');

  // Check if admin already exists
  for (var i = 1; i < data.length; i++) {
    if (data[i][emailCol] && data[i][emailCol].toString().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      // Update existing
      sheet.getRange(i + 1, pwCol + 1).setValue(hashPassword(ADMIN_PASSWORD));
      sheet.getRange(i + 1, namaCol + 1).setValue(ADMIN_NAMA);
      sheet.getRange(i + 1, roleCol + 1).setValue('yayasan');
      Logger.log('✅ Admin account UPDATED:');
      Logger.log('   Email: ' + ADMIN_EMAIL);
      Logger.log('   Password: ' + ADMIN_PASSWORD);
      Logger.log('   Nama: ' + ADMIN_NAMA);
      Logger.log('   Role: yayasan');
      return;
    }
  }

  // Create new admin
  var userId = 'usr_admin_' + Utilities.getUuid().substring(0, 4);
  var now = new Date().toISOString();
  sheet.appendRow([
    userId, ADMIN_EMAIL, hashPassword(ADMIN_PASSWORD), ADMIN_NAMA,
    'yayasan', 'pratama', '', 'aktif', '', '', '', 0, 0, '[]', '', now, 'ikhwan'
  ]);

  Logger.log('✅ Admin account CREATED:');
  Logger.log('   Email: ' + ADMIN_EMAIL);
  Logger.log('   Password: ' + ADMIN_PASSWORD);
  Logger.log('   Nama: ' + ADMIN_NAMA);
  Logger.log('   Role: yayasan');
  Logger.log('');
  Logger.log('⚠️  PENTING: Setelah login, segera ganti password dari halaman Profil!');
}

/**
 * Migrate existing spreadsheet: add missing columns to existing sheets.
 * Safe to run multiple times.
 * 
 * Menu: Run > migrateDatabase
 */
function migrateDatabase() {
  var ss = getSpreadsheet();
  
  // 1. Ensure gender column in users
  var usersSheet = ss.getSheetByName('users');
  if (usersSheet) {
    ensureUserHeaders(usersSheet);
    Logger.log('✅ Users sheet headers verified (including gender).');

    // 1b. Fix pembina/yayasan tingkatan → 'pratama'
    var uData = usersSheet.getDataRange().getValues();
    var uHeaders = uData[0];
    var roleCol = uHeaders.indexOf('role');
    var tingkatanCol = uHeaders.indexOf('tingkatan');
    var fixCount = 0;

    if (roleCol >= 0 && tingkatanCol >= 0) {
      for (var i = 1; i < uData.length; i++) {
        var role = (uData[i][roleCol] || '').toString().toLowerCase();
        var tingkatan = (uData[i][tingkatanCol] || '').toString().toLowerCase();
        if ((role === 'pembina' || role === 'yayasan') && tingkatan !== 'pratama') {
          usersSheet.getRange(i + 1, tingkatanCol + 1).setValue('pratama');
          fixCount++;
        }
      }
      if (fixCount > 0) {
        Logger.log('✅ ' + fixCount + ' akun pembina/yayasan di-set ke tingkatan "pratama".');
      }
    }
  }

  // 2. Ensure rapor_bulanan exists
  createSheetIfNotExists(ss, 'rapor_bulanan', [
    'rapor_id', 'user_id', 'nama', 'bulan', 'tahun', 'total_weeks',
    'rata_rata', 'predikat_label', 'predikat_level', 'summary_json',
    'week_summaries_json', 'generated_at'
  ]);

  // 3. Ensure helpdesk sheets
  createSheetIfNotExists(ss, 'helpdesk_tickets', [
    'ticket_id', 'user_id', 'user_nama', 'user_email', 'kategori',
    'subjek', 'pesan', 'status', 'priority', 'created_at', 'updated_at'
  ]);
  createSheetIfNotExists(ss, 'helpdesk_replies', [
    'reply_id', 'ticket_id', 'user_id', 'user_nama', 'role',
    'pesan', 'created_at'
  ]);

  // 4. Ensure group headers
  var groupsSheet = ss.getSheetByName('groups');
  if (groupsSheet) ensureGroupHeaders(groupsSheet);

  // 5. Clean up tabs
  cleanupSheetTabs(ss);

  Logger.log('');
  Logger.log('✅ Migrasi selesai! Semua kolom & sheet ter-update.');
}

