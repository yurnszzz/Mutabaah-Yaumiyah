/**
 * ============================================
 * Mutabaah.gs - CRUD Mutabaah Data
 * ============================================
 */

const HARI_KEYS = ['sen', 'sel', 'rab', 'kam', 'jum', 'sab', 'min'];
const WAKTU_KEYS = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

// Target per tingkatan
const TARGET = {
  muda: {
    sholat_fardu: 35, shalat_berjamaah: 14, sholat_dhuha: 7, tilawah: 1,
    matsurat: 3, shaum: 1, qiyamullail: 1
  },
  pratama: {
    sholat_fardu: 35, shalat_berjamaah: 21, sholat_dhuha: 7, tilawah: 3.5,
    matsurat: 3, shaum: 2, qiyamullail: 1
  }
};

// Ibadah affected by haid — same as frontend
const IBADAH_TERDAMPAK_HAID = ['sholat_fardu', 'shalat_berjamaah', 'sholat_dhuha', 'shaum'];

/**
 * Submit mutabaah data for a week
 * data: { userId, grupId, tingkatan, pekan, tahun, weekData }
 */
function submitMutabaah(data) {
  if (!data.userId || !data.pekan || !data.tahun) {
    return { error: 'userId, pekan, dan tahun diperlukan' };
  }

  const tahun = parseInt(data.tahun);
  const pekan = parseInt(data.pekan);
  const sheetName = 'mutabaah_' + tahun;
  const sheet = getSheet(sheetName);

  // Check if header exists, setup if not
  if (sheet.getLastRow() === 0) {
    const ss = getSpreadsheet();
    setupMutabaahSheet(ss, tahun);
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const weekData = data.weekData;

  // Check if record already exists for this user+week
  const existingRow = findExistingRecord(sheet, headers, data.userId, pekan, tahun);
  var isEdit = false;

  // Build row data
  const row = buildMutabaahRow(headers, data, weekData);

  if (existingRow > 0) {
    // C3: Track edit — read existing audit fields before overwrite
    isEdit = true;
    var existingData = sheet.getRange(existingRow, 1, 1, headers.length).getValues()[0];
    var editCountCol = headers.indexOf('edit_count');
    var lastEditCol = headers.indexOf('last_edited_at');
    var firstSubCol = headers.indexOf('first_submitted_at');

    var prevEditCount = parseInt(existingData[editCountCol]) || 0;
    var prevFirstSubmit = existingData[firstSubCol] || existingData[headers.indexOf('tanggal_submit')];

    if (editCountCol >= 0) row[editCountCol] = prevEditCount + 1;
    if (lastEditCol >= 0) row[lastEditCol] = new Date().toISOString();
    if (firstSubCol >= 0) row[firstSubCol] = prevFirstSubmit || new Date().toISOString();

    // Update existing record
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    // New record — set initial audit fields
    var ecCol = headers.indexOf('edit_count');
    var leCol = headers.indexOf('last_edited_at');
    var fsCol = headers.indexOf('first_submitted_at');
    if (ecCol >= 0) row[ecCol] = 0;
    if (leCol >= 0) row[leCol] = '';
    if (fsCol >= 0) row[fsCol] = new Date().toISOString();

    // Append new record
    sheet.appendRow(row);
  }

  // Clear caches
  clearUserCaches(data.userId, tahun, pekan);

  // Update rekap
  updateRekapMingguan(data.grupId, pekan, tahun);

  // Update user streak
  updateStreak(data.userId, data.pekan, data.tahun);

  return {
    message: 'Mutabaah berhasil disimpan',
    recordId: row[0],
    percentages: calculateServerPercentages(weekData, data.tingkatan)
  };
}

/**
 * Get current week data for a user
 */
function getCurrentWeekData(userId, tahun, pekan) {
  if (!userId) return { error: 'userId diperlukan' };

  tahun = tahun || new Date().getFullYear();
  if (!pekan) {
    const wi = getWeekInfoServer();
    pekan = wi.weekNumber;
  }

  // Check cache
  const cacheKey = 'mutabaah_' + userId + '_' + tahun + '_' + pekan;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const sheetName = 'mutabaah_' + tahun;
  const sheet = getSheet(sheetName);

  if (sheet.getLastRow() <= 1) {
    return { data: null, exists: false };
  }

  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const userIdCol = headers.indexOf('user_id');
  const pekanCol = headers.indexOf('pekan_ke');
  const tahunCol = headers.indexOf('tahun');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][userIdCol] === userId &&
        parseInt(allData[i][pekanCol]) === parseInt(pekan) &&
        parseInt(allData[i][tahunCol]) === parseInt(tahun)) {
      const record = rowToObject(headers, allData[i]);
      const result = {
        data: parseRecordToWeekData(record),
        record,
        exists: true
      };
      setCachedData(cacheKey, result, 3600); // 1 hour cache
      return result;
    }
  }

  return { data: null, exists: false };
}

/**
 * Get history for a user (paginated)
 */
function getHistory(userId, tahun, limit, offset) {
  if (!userId) return { error: 'userId diperlukan' };

  tahun = tahun || new Date().getFullYear();
  limit = limit || 10;
  offset = offset || 0;

  const sheetName = 'mutabaah_' + tahun;
  const sheet = getSheet(sheetName);

  if (sheet.getLastRow() <= 1) {
    return { records: [], total: 0, hasMore: false };
  }

  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const userIdCol = headers.indexOf('user_id');
  const pekanCol = headers.indexOf('pekan_ke');

  // Collect all records for user, sort by pekan desc
  const userRecords = [];
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][userIdCol] === userId) {
      userRecords.push(rowToObject(headers, allData[i]));
    }
  }

  userRecords.sort((a, b) => parseInt(b.pekan_ke) - parseInt(a.pekan_ke));

  const total = userRecords.length;
  const paginated = userRecords.slice(offset, offset + limit);

  return {
    records: paginated.map(r => ({
      ...r,
      weekData: parseRecordToWeekData(r)
    })),
    total,
    hasMore: (offset + limit) < total
  };
}

/**
 * Get dashboard data (summary) for a user
 */
function getDashboardData(userId) {
  if (!userId) return { error: 'userId diperlukan' };

  const cacheKey = 'dashboard_' + userId;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  // Get user info
  const userResult = getUserById(userId);
  if (userResult.error) return userResult;
  const user = userResult.user;

  // Get current week info
  const weekInfo = getWeekInfoServer();
  const tahun = weekInfo.year;
  const pekan = weekInfo.weekNumber;

  // Get current week data
  const currentWeek = getCurrentWeekData(userId, tahun, pekan);

  // Get streak from user data
  const result = {
    user,
    weekInfo,
    currentWeek: currentWeek.exists ? {
      percentages: calculateServerPercentages(
        currentWeek.data || {},
        user.tingkatan || 'muda',
        (currentWeek.data && currentWeek.data.hari_haid) ? currentWeek.data.hari_haid.length : 0
      ),
      submittedAt: currentWeek.record ? currentWeek.record.tanggal_submit : null,
    } : null,
    streak: parseInt(user.streak_current) || 0,
  };

  setCachedData(cacheKey, result, 1800); // 30 min cache
  return result;
}

/**
 * Reset (delete) week data
 */
function resetWeekData(userId, tahun, pekan) {
  if (!userId || !tahun || !pekan) {
    return { error: 'userId, tahun, dan pekan diperlukan' };
  }

  const sheetName = 'mutabaah_' + tahun;
  const sheet = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const row = findExistingRecord(sheet, headers, userId, parseInt(pekan), parseInt(tahun));
  if (row > 0) {
    sheet.deleteRow(row);
    clearUserCaches(userId, tahun, pekan);
    return { message: 'Data pekan berhasil dihapus' };
  }

  return { message: 'Tidak ada data untuk dihapus' };
}

// ============ HELPER FUNCTIONS ============

function findExistingRecord(sheet, headers, userId, pekan, tahun) {
  if (sheet.getLastRow() <= 1) return -1;

  const data = sheet.getDataRange().getValues();
  const userIdCol = headers.indexOf('user_id');
  const pekanCol = headers.indexOf('pekan_ke');
  const tahunCol = headers.indexOf('tahun');

  for (let i = 1; i < data.length; i++) {
    if (data[i][userIdCol] === userId &&
        parseInt(data[i][pekanCol]) === parseInt(pekan) &&
        parseInt(data[i][tahunCol]) === parseInt(tahun)) {
      return i + 1; // 1-indexed row
    }
  }
  return -1;
}

function buildMutabaahRow(headers, data, weekData) {
  const row = new Array(headers.length).fill('');
  const now = new Date();

  // Check if terlambat (after Sunday 23:59)
  const weekInfo = getWeekInfoServer();
  const sundayEnd = new Date(weekInfo.sunday);
  sundayEnd.setHours(23, 59, 59);
  const isTerlambat = now > sundayEnd && parseInt(data.pekan) === weekInfo.weekNumber;

  // Set metadata
  setCol(row, headers, 'record_id', data.userId + '_' + data.tahun + '_' + data.pekan);
  setCol(row, headers, 'user_id', data.userId);
  setCol(row, headers, 'grup_id', data.grupId || '');
  setCol(row, headers, 'tingkatan', data.tingkatan || 'muda');
  setCol(row, headers, 'pekan_ke', parseInt(data.pekan));
  setCol(row, headers, 'tahun', parseInt(data.tahun));
  setCol(row, headers, 'tanggal_mulai_pekan', weekInfo.monday.toISOString());
  setCol(row, headers, 'tanggal_submit', now.toISOString());
  setCol(row, headers, 'is_terlambat', isTerlambat ? 1 : 0);

  // Sholat Fardu (35 cols)
  if (weekData.sholat_fardu) {
    const HARI_MAP = { 'Senin': 'sen', 'Selasa': 'sel', 'Rabu': 'rab', 'Kamis': 'kam', 'Jumat': 'jum', 'Sabtu': 'sab', 'Minggu': 'min' };
    const WAKTU_MAP = { 'Subuh': 'subuh', 'Dzuhur': 'dzuhur', 'Ashar': 'ashar', 'Maghrib': 'maghrib', 'Isya': 'isya' };

    for (const [hari, waktuMap] of Object.entries(weekData.sholat_fardu)) {
      const hKey = HARI_MAP[hari] || hari;
      for (const [waktu, val] of Object.entries(waktuMap)) {
        const wKey = WAKTU_MAP[waktu] || waktu;
        setCol(row, headers, hKey + '_' + wKey, val ? 1 : 0);
      }
    }
  }

  // Shalat Berjamaah (35 cols)
  if (weekData.shalat_berjamaah) {
    const HARI_MAP = { 'Senin': 'sen', 'Selasa': 'sel', 'Rabu': 'rab', 'Kamis': 'kam', 'Jumat': 'jum', 'Sabtu': 'sab', 'Minggu': 'min' };
    const WAKTU_MAP = { 'Subuh': 'subuh', 'Dzuhur': 'dzuhur', 'Ashar': 'ashar', 'Maghrib': 'maghrib', 'Isya': 'isya' };

    for (const [hari, waktuMap] of Object.entries(weekData.shalat_berjamaah)) {
      const hKey = HARI_MAP[hari] || hari;
      for (const [waktu, val] of Object.entries(waktuMap)) {
        const wKey = WAKTU_MAP[waktu] || waktu;
        setCol(row, headers, 'jamaah_' + hKey + '_' + wKey, val || 'tidak');
      }
    }
  }

  // Other fields
  setCol(row, headers, 'tilawah_juz', parseFloat(weekData.tilawah_juz) || 0);
  setCol(row, headers, 'tilawah_halaman', parseFloat(weekData.tilawah_halaman) || 0);
  const totalJuz = (parseFloat(weekData.tilawah_juz) || 0) + ((parseFloat(weekData.tilawah_halaman) || 0) / 20);
  setCol(row, headers, 'tilawah_total_juz', totalJuz);
  setCol(row, headers, 'sholat_dhuha', parseInt(weekData.sholat_dhuha) || 0);
  setCol(row, headers, 'matsurat', parseInt(weekData.matsurat) || 0);
  setCol(row, headers, 'shaum', parseInt(weekData.shaum) || 0);
  setCol(row, headers, 'qiyamullail', parseInt(weekData.qiyamullail) || 0);
  setCol(row, headers, 'kehadiran_upa', weekData.kehadiran_upa || 'hadir');
  setCol(row, headers, 'terlambat_upa_menit', parseInt(weekData.terlambat_upa_menit) || 0);

  // Haid tracking
  var hariHaid = weekData.hari_haid || [];
  setCol(row, headers, 'hari_haid', Array.isArray(hariHaid) ? hariHaid.join(',') : '');
  setCol(row, headers, 'hari_haid_count', Array.isArray(hariHaid) ? hariHaid.length : 0);

  // Compute percentages (with haid adjustment)
  var haidDays = Array.isArray(hariHaid) ? hariHaid.length : 0;
  const pct = calculateServerPercentages(weekData, data.tingkatan || 'muda', haidDays);
  setCol(row, headers, 'persen_sholat_fardu', pct.sholat_fardu || 0);
  setCol(row, headers, 'persen_berjamaah', pct.shalat_berjamaah || 0);
  setCol(row, headers, 'persen_sholat_dhuha', pct.sholat_dhuha || 0);
  setCol(row, headers, 'persen_tilawah', pct.tilawah || 0);
  setCol(row, headers, 'persen_matsurat', pct.matsurat || 0);
  setCol(row, headers, 'persen_shaum', pct.shaum || 0);
  setCol(row, headers, 'persen_qiyamullail', pct.qiyamullail || 0);
  setCol(row, headers, 'persen_rata_rata', pct.rata_rata || 0);
  setCol(row, headers, 'status', isTerlambat ? 'terlambat' : 'submitted');

  return row;
}

function setCol(row, headers, colName, value) {
  const idx = headers.indexOf(colName);
  if (idx >= 0) row[idx] = value;
}

/**
 * Parse flat record back to nested weekData structure
 */
function parseRecordToWeekData(record) {
  const HARI_MAP = { 'sen': 'Senin', 'sel': 'Selasa', 'rab': 'Rabu', 'kam': 'Kamis', 'jum': 'Jumat', 'sab': 'Sabtu', 'min': 'Minggu' };
  const WAKTU_MAP = { 'subuh': 'Subuh', 'dzuhur': 'Dzuhur', 'ashar': 'Ashar', 'maghrib': 'Maghrib', 'isya': 'Isya' };

  const sholat_fardu = {};
  const shalat_berjamaah = {};

  HARI_KEYS.forEach(h => {
    const hari = HARI_MAP[h];
    sholat_fardu[hari] = {};
    shalat_berjamaah[hari] = {};
    WAKTU_KEYS.forEach(w => {
      const waktu = WAKTU_MAP[w];
      sholat_fardu[hari][waktu] = record[h + '_' + w] === 1 || record[h + '_' + w] === '1' || record[h + '_' + w] === true;
      shalat_berjamaah[hari][waktu] = record['jamaah_' + h + '_' + w] || 'tidak';
    });
  });

  return {
    sholat_fardu,
    shalat_berjamaah,
    sholat_dhuha: parseInt(record.sholat_dhuha) || 0,
    tilawah_juz: parseFloat(record.tilawah_juz) || 0,
    tilawah_halaman: parseFloat(record.tilawah_halaman) || 0,
    matsurat: parseInt(record.matsurat) || 0,
    shaum: parseInt(record.shaum) || 0,
    qiyamullail: parseInt(record.qiyamullail) || 0,
    kehadiran_upa: record.kehadiran_upa || 'hadir',
    terlambat_upa_menit: parseInt(record.terlambat_upa_menit) || 0,
    hari_haid: record.hari_haid ? String(record.hari_haid).split(',').filter(Boolean) : [],
  };
}

/**
 * Calculate percentages on server side (with optional haid adjustment)
 */
function calculateServerPercentages(weekData, tingkatan, haidDays) {
  haidDays = parseInt(haidDays) || 0;
  var target = JSON.parse(JSON.stringify(TARGET[tingkatan] || TARGET['muda']));

  // Adjust targets for haid
  if (haidDays > 0) {
    var activeDays = Math.max(7 - haidDays, 0);
    var ratio = activeDays / 7;
    IBADAH_TERDAMPAK_HAID.forEach(function(key) {
      if (target[key] !== undefined) {
        target[key] = Math.round(target[key] * ratio * 10) / 10;
      }
    });
  }

  // Count sholat fardu
  let totalSholat = 0;
  let totalJamaah = 0;
  if (weekData.sholat_fardu) {
    for (const hari of Object.values(weekData.sholat_fardu)) {
      for (const val of Object.values(hari)) {
        if (val === true || val === 1 || val === '1') totalSholat++;
      }
    }
  }
  if (weekData.shalat_berjamaah) {
    for (const hari of Object.values(weekData.shalat_berjamaah)) {
      for (const val of Object.values(hari)) {
        if (val === 'jamaah') totalJamaah++;
      }
    }
  }

  const tilawahTotal = (parseFloat(weekData.tilawah_juz) || 0) + ((parseFloat(weekData.tilawah_halaman) || 0) / 20);

  function safePct(actual, targetVal) {
    if (targetVal <= 0) return haidDays >= 7 ? 100 : 0;
    return Math.min(Math.round((actual / targetVal) * 100), 100);
  }

  const pctSholat = safePct(totalSholat, target.sholat_fardu);
  const pctJamaah = safePct(totalJamaah, target.shalat_berjamaah);
  const pctDhuha = safePct(parseInt(weekData.sholat_dhuha) || 0, target.sholat_dhuha);
  const pctTilawah = safePct(tilawahTotal, target.tilawah);
  const pctMatsurat = safePct(parseInt(weekData.matsurat) || 0, target.matsurat);
  const pctShaum = safePct(parseInt(weekData.shaum) || 0, target.shaum);
  const pctQiyam = safePct(parseInt(weekData.qiyamullail) || 0, target.qiyamullail);

  const rataRata = Math.round((pctSholat + pctJamaah + pctDhuha + pctTilawah + pctMatsurat + pctShaum + pctQiyam) / 7);

  return {
    sholat_fardu: pctSholat,
    shalat_berjamaah: pctJamaah,
    sholat_dhuha: pctDhuha,
    tilawah: pctTilawah,
    matsurat: pctMatsurat,
    shaum: pctShaum,
    qiyamullail: pctQiyam,
    rata_rata: rataRata,
  };
}

/**
 * Update rekap mingguan (group summary cache)
 */
function updateRekapMingguan(grupId, pekan, tahun) {
  if (!grupId) return;

  const sheetName = 'mutabaah_' + tahun;
  const dataSheet = getSheet(sheetName);
  if (dataSheet.getLastRow() <= 1) return;

  const allData = dataSheet.getDataRange().getValues();
  const headers = allData[0];
  const grupCol = headers.indexOf('grup_id');
  const pekanCol = headers.indexOf('pekan_ke');

  // Collect group records for this week
  const groupRecords = [];
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][grupCol] === grupId && parseInt(allData[i][pekanCol]) === parseInt(pekan)) {
      groupRecords.push(rowToObject(headers, allData[i]));
    }
  }

  // Count members in group
  const usersSheet = getSheet('users');
  const usersData = usersSheet.getDataRange().getValues();
  const usersHeaders = usersData[0];
  const uGrupCol = usersHeaders.indexOf('grup_id');
  const uStatusCol = usersHeaders.indexOf('status');
  let totalAnggota = 0;
  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][uGrupCol] === grupId && usersData[i][uStatusCol] === 'aktif') {
      totalAnggota++;
    }
  }

  // Calculate averages
  const n = groupRecords.length;
  const avgSholat = n > 0 ? Math.round(groupRecords.reduce((s, r) => s + (parseFloat(r.persen_sholat_fardu) || 0), 0) / n) : 0;
  const avgJamaah = n > 0 ? Math.round(groupRecords.reduce((s, r) => s + (parseFloat(r.persen_berjamaah) || 0), 0) / n) : 0;
  const avgDhuha = n > 0 ? Math.round(groupRecords.reduce((s, r) => s + (parseFloat(r.persen_sholat_dhuha) || 0), 0) / n) : 0;
  const avgTilawah = n > 0 ? Math.round(groupRecords.reduce((s, r) => s + (parseFloat(r.persen_tilawah) || 0), 0) / n) : 0;
  const avgMatsurat = n > 0 ? Math.round(groupRecords.reduce((s, r) => s + (parseFloat(r.persen_matsurat) || 0), 0) / n) : 0;
  const avgShaum = n > 0 ? Math.round(groupRecords.reduce((s, r) => s + (parseFloat(r.persen_shaum) || 0), 0) / n) : 0;
  const avgQiyam = n > 0 ? Math.round(groupRecords.reduce((s, r) => s + (parseFloat(r.persen_qiyamullail) || 0), 0) / n) : 0;
  const avgTotal = Math.round((avgSholat + avgJamaah + avgDhuha + avgTilawah + avgMatsurat + avgShaum + avgQiyam) / 7);
  const terlambat = groupRecords.filter(r => r.is_terlambat === 1 || r.is_terlambat === '1').length;

  // Update rekap sheet
  const rekapSheet = getSheet('rekap_mingguan');
  const rekapData = rekapSheet.getDataRange().getValues();
  const rekapHeaders = rekapData[0];

  let existingRow = -1;
  for (let i = 1; i < rekapData.length; i++) {
    if (rekapData[i][0] === grupId && parseInt(rekapData[i][1]) === parseInt(pekan) && parseInt(rekapData[i][2]) === parseInt(tahun)) {
      existingRow = i + 1;
      break;
    }
  }

  const rekapRow = [
    grupId, pekan, tahun, totalAnggota, n, terlambat,
    avgSholat, avgJamaah, avgDhuha, avgTilawah, avgMatsurat, avgShaum, avgQiyam, avgTotal
  ];

  if (existingRow > 0) {
    rekapSheet.getRange(existingRow, 1, 1, rekapRow.length).setValues([rekapRow]);
  } else {
    rekapSheet.appendRow(rekapRow);
  }
}

/**
 * Update user streak — correct logic:
 * - Only count a NEW week (not re-edits of the same week)
 * - Check if the immediately previous week was also submitted
 * - If gap → restart streak to 1
 * - If consecutive → streak + 1
 */
function updateStreak(userId, pekan, tahun) {
  pekan = parseInt(pekan);
  tahun = parseInt(tahun);

  // 1. Check how many distinct weeks this user has submitted this year
  var sheetName = 'mutabaah_' + tahun;
  var sheet = getSheet(sheetName);
  if (sheet.getLastRow() <= 1) {
    // First ever submission — streak = 1
    setStreakValue(userId, 1);
    return;
  }

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var userIdCol = headers.indexOf('user_id');
  var pekanCol = headers.indexOf('pekan_ke');
  var tahunCol = headers.indexOf('tahun');

  // Collect all distinct pekan numbers for this user
  var submittedWeeks = {};
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][userIdCol] === userId) {
      var wk = parseInt(allData[i][pekanCol]);
      var yr = parseInt(allData[i][tahunCol]);
      submittedWeeks[yr + '_' + wk] = wk;
    }
  }

  // Also check previous year if pekan = 1
  if (pekan === 1) {
    var prevSheetName = 'mutabaah_' + (tahun - 1);
    var ss = getSpreadsheet();
    var prevSheet = ss.getSheetByName(prevSheetName);
    if (prevSheet && prevSheet.getLastRow() > 1) {
      var prevData = prevSheet.getDataRange().getValues();
      var prevHeaders = prevData[0];
      var pUserIdCol = prevHeaders.indexOf('user_id');
      var pPekanCol = prevHeaders.indexOf('pekan_ke');
      var pTahunCol = prevHeaders.indexOf('tahun');
      for (var j = 1; j < prevData.length; j++) {
        if (prevData[j][pUserIdCol] === userId) {
          var pwk = parseInt(prevData[j][pPekanCol]);
          var pyr = parseInt(prevData[j][pTahunCol]);
          submittedWeeks[pyr + '_' + pwk] = pwk;
        }
      }
    }
  }

  // 2. Walk backwards from current pekan to count consecutive submitted weeks
  var streak = 0;
  var checkPekan = pekan;
  var checkTahun = tahun;

  while (true) {
    var key = checkTahun + '_' + checkPekan;
    if (submittedWeeks[key] !== undefined) {
      streak++;
      // Go to previous week
      checkPekan--;
      if (checkPekan < 1) {
        // Go to last week of previous year (approximate: use 52)
        checkTahun--;
        checkPekan = 52;
        // If we don't have data for the prev year, break
        if (!submittedWeeks[checkTahun + '_' + checkPekan]) {
          // Try 53 as some years have 53 weeks
          if (submittedWeeks[checkTahun + '_53']) {
            checkPekan = 53;
            continue;
          }
          break;
        }
      }
    } else {
      break;
    }
  }

  if (streak < 1) streak = 1; // At minimum, current submission counts
  setStreakValue(userId, streak);
}

function setStreakValue(userId, streak) {
  var usersSheet = getSheet('users');
  var usersData = usersSheet.getDataRange().getValues();
  var usersHeaders = usersData[0];
  var idCol = usersHeaders.indexOf('user_id');
  var streakCol = usersHeaders.indexOf('streak_current');
  var longestCol = usersHeaders.indexOf('streak_longest');

  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][idCol] === userId) {
      var longest = Math.max(streak, parseInt(usersData[i][longestCol]) || 0);
      usersSheet.getRange(i + 1, streakCol + 1).setValue(streak);
      usersSheet.getRange(i + 1, longestCol + 1).setValue(longest);
      break;
    }
  }
}

function clearUserCaches(userId, tahun, pekan) {
  const cache = CacheService.getScriptCache();
  cache.removeAll([
    'user_id_' + userId,
    'mutabaah_' + userId + '_' + tahun + '_' + pekan,
    'dashboard_' + userId,
  ]);
}
