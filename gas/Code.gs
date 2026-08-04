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
      case 'getGrupAnggota':
        result = getGrupAnggota(e.parameter.grupId);
        break;
      case 'getGrupRekap':
        result = getGrupRekap(e.parameter.grupId, e.parameter.tahun, e.parameter.pekan);
        break;
      case 'getAllGrupRekap':
        result = getAllGrupRekap(e.parameter.tahun, e.parameter.pekan);
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
 * Ensure the users sheet has proper headers.
 * Critical: without headers, rowToObject and appendRow produce garbage data.
 */
function ensureUserHeaders(usersSheet) {
  var expectedHeaders = [
    'user_id', 'email', 'password_hash', 'nama', 'role', 'tingkatan',
    'grup_id', 'status', 'transisi_dari', 'transisi_mulai',
    'transisi_durasi_pekan', 'streak_current', 'streak_longest',
    'badges', 'no_whatsapp', 'created_at'
  ];
  if (usersSheet.getLastRow() === 0) {
    // Empty sheet - add headers
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    usersSheet.setFrozenRows(1);
    return;
  }
  // Check if row 1 looks like headers
  var firstRow = usersSheet.getRange(1, 1, 1, Math.max(usersSheet.getLastColumn(), expectedHeaders.length)).getValues()[0];
  if (firstRow[0] !== 'user_id') {
    // Row 1 is data, not headers - insert header row
    usersSheet.insertRowBefore(1);
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    usersSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    usersSheet.setFrozenRows(1);
  }
}

// ============ DATABASE SETUP ============

/**
 * Jalankan fungsi ini SEKALI untuk membuat struktur database
 * Menu: Run > setupDatabase
 */
function setupDatabase() {
  const ss = getSpreadsheet();

  // Sheet: users
  createSheetIfNotExists(ss, 'users', [
    'user_id', 'email', 'password_hash', 'nama', 'role', 'tingkatan',
    'grup_id', 'status', 'transisi_dari', 'transisi_mulai',
    'transisi_durasi_pekan', 'streak_current', 'streak_longest',
    'badges', 'no_whatsapp', 'created_at'
  ]);

  // Sheet: groups
  createSheetIfNotExists(ss, 'groups', [
    'grup_id', 'nama_grup', 'pembina_user_id', 'created_at'
  ]);

  // Sheet: mutabaah_YYYY (tahun ini)
  const tahun = new Date().getFullYear();
  setupMutabaahSheet(ss, tahun);

  // Sheet: rekap_mingguan
  createSheetIfNotExists(ss, 'rekap_mingguan', [
    'grup_id', 'pekan_ke', 'tahun', 'jumlah_anggota', 'jumlah_mengisi',
    'jumlah_terlambat', 'rata_rata_sholat_fardu', 'rata_rata_berjamaah',
    'rata_rata_sholat_dhuha', 'rata_rata_tilawah', 'rata_rata_matsurat',
    'rata_rata_shaum', 'rata_rata_qiyamullail', 'rata_rata_keseluruhan'
  ]);

  // Sheet: arsip_anggota
  createSheetIfNotExists(ss, 'arsip_anggota', [
    'arsip_id', 'user_id', 'nama', 'grup_asal',
    'alasan', 'tanggal_arsip', 'data_json'
  ]);

  // Insert sample data
  insertSampleData(ss);

  Logger.log('Database setup selesai!');
}

function setupMutabaahSheet(ss, tahun) {
  const sheetName = 'mutabaah_' + tahun;
  const HARI = ['sen', 'sel', 'rab', 'kam', 'jum', 'sab', 'min'];
  const WAKTU = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

  // Generate sholat fardu columns: sen_subuh, sen_dzuhur, ...
  const sholatCols = [];
  HARI.forEach(h => WAKTU.forEach(w => sholatCols.push(h + '_' + w)));

  // Generate jamaah columns: jamaah_sen_subuh, ...
  const jamaahCols = [];
  HARI.forEach(h => WAKTU.forEach(w => jamaahCols.push('jamaah_' + h + '_' + w)));

  const headers = [
    'record_id', 'user_id', 'grup_id', 'tingkatan',
    'pekan_ke', 'tahun', 'tanggal_mulai_pekan', 'tanggal_submit', 'is_terlambat',
    ...sholatCols,
    ...jamaahCols,
    'tilawah_juz', 'tilawah_halaman', 'tilawah_total_juz',
    'sholat_dhuha', 'matsurat', 'shaum', 'qiyamullail',
    'kehadiran_upa', 'terlambat_upa_menit',
    'persen_sholat_fardu', 'persen_berjamaah', 'persen_sholat_dhuha',
    'persen_tilawah', 'persen_matsurat', 'persen_shaum', 'persen_qiyamullail',
    'persen_rata_rata', 'status',
    'edit_count', 'last_edited_at', 'first_submitted_at'
  ];

  createSheetIfNotExists(ss, sheetName, headers);
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    Logger.log('Sheet "' + name + '" dibuat dengan ' + headers.length + ' kolom');
  }
  return sheet;
}

function insertSampleData(ss) {
  // Sample groups
  const groupsSheet = ss.getSheetByName('groups');
  if (groupsSheet.getLastRow() <= 1) {
    groupsSheet.appendRow(['grp_001', 'Ustadz Hamdan', 'usr_001', new Date().toISOString()]);
  }

  // Sample users (with password_hash column)
  const usersSheet = ss.getSheetByName('users');
  if (usersSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    // Pembina
    usersSheet.appendRow([
      'usr_001', 'ustadz.hamdan@sit-matahari.sch.id', '', 'Ustadz Hamdan',
      'pembina', '', 'grp_001', 'aktif', '', '', '', 0, 0, '[]', '', now
    ]);
    // Yayasan / Admin (default password: admin123)
    usersSheet.appendRow([
      'usr_004', 'yayasan@sit-matahari.sch.id', hashPassword('admin123'), 'Admin Yayasan',
      'yayasan', '', '', 'aktif', '', '', '', 0, 0, '[]', '', now
    ]);
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
    'yayasan', '', '', 'aktif', '', '', '', 0, 0, '[]', '', now
  ]);

  Logger.log('✅ Admin account CREATED:');
  Logger.log('   Email: ' + ADMIN_EMAIL);
  Logger.log('   Password: ' + ADMIN_PASSWORD);
  Logger.log('   Nama: ' + ADMIN_NAMA);
  Logger.log('   Role: yayasan');
  Logger.log('');
  Logger.log('⚠️  PENTING: Setelah login, segera ganti password dari halaman Profil!');
}
