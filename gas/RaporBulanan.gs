/**
 * ============================================
 * RaporBulanan.gs - Monthly Report Generation
 * ============================================
 * C2: Generates aggregated monthly reports from weekly mutabaah data.
 * Supports both on-demand generation and auto-trigger via time-based trigger.
 */

/**
 * Get monthly report for a user — on-demand
 * Aggregates all weekly records in the given month.
 */
function getMonthlyReport(userId, bulan, tahun) {
  if (!userId || !bulan || !tahun) {
    return { error: 'userId, bulan, dan tahun diperlukan' };
  }

  bulan = parseInt(bulan);
  tahun = parseInt(tahun);

  // Get user info
  var userResult = getUserById(userId);
  if (userResult.error) return userResult;
  var user = userResult.user;
  delete user.password_hash;

  var sheetName = 'mutabaah_' + tahun;
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      user: user,
      bulan: bulan,
      tahun: tahun,
      bulanLabel: getBulanLabel(bulan),
      records: [],
      summary: null,
      totalWeeks: 0,
      message: 'Tidak ada data mutabaah untuk bulan ini'
    };
  }

  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var userIdCol = headers.indexOf('user_id');
  var pekanCol = headers.indexOf('pekan_ke');
  var submitCol = headers.indexOf('tanggal_submit');
  var startCol = headers.indexOf('tanggal_mulai_pekan');

  // Determine which weeks fall in this month
  // A week belongs to a month if its Monday falls in that month
  var records = [];
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][userIdCol] !== userId) continue;

    var startDate = allData[i][startCol];
    if (!startDate) continue;

    var date = new Date(startDate);
    if (date.getMonth() + 1 === bulan && date.getFullYear() === tahun) {
      records.push(rowToObject(headers, allData[i]));
    }
  }

  if (records.length === 0) {
    return {
      user: user,
      bulan: bulan,
      tahun: tahun,
      bulanLabel: getBulanLabel(bulan),
      records: [],
      summary: null,
      totalWeeks: 0,
      message: 'Tidak ada data mutabaah untuk bulan ini'
    };
  }

  // Compute averages across weeks
  var n = records.length;
  var fields = [
    'persen_sholat_fardu', 'persen_berjamaah', 'persen_sholat_dhuha',
    'persen_tilawah', 'persen_matsurat', 'persen_shaum', 'persen_qiyamullail'
  ];
  var labels = {
    'persen_sholat_fardu': 'Sholat Fardu',
    'persen_berjamaah': 'Shalat Berjamaah',
    'persen_sholat_dhuha': 'Sholat Dhuha',
    'persen_tilawah': 'Tilawah Al-Quran',
    'persen_matsurat': 'Al-Matsurat',
    'persen_shaum': 'Puasa Sunnah',
    'persen_qiyamullail': 'Qiyamullail'
  };

  var summary = {};
  var totalAll = 0;

  fields.forEach(function(field) {
    var sum = 0;
    records.forEach(function(r) {
      sum += parseFloat(r[field]) || 0;
    });
    var avg = Math.round(sum / n);
    summary[field] = {
      average: avg,
      label: labels[field],
      weeks: records.map(function(r) {
        return {
          pekan: parseInt(r.pekan_ke),
          value: parseFloat(r[field]) || 0
        };
      })
    };
    totalAll += avg;
  });

  var rataRata = Math.round(totalAll / fields.length);
  var predikat = getPredikat(rataRata);

  // Per-week summaries
  var weekSummaries = records.map(function(r) {
    return {
      pekan: parseInt(r.pekan_ke),
      rata_rata: parseInt(r.persen_rata_rata) || 0,
      tanggal_submit: r.tanggal_submit,
      is_terlambat: r.is_terlambat === 1 || r.is_terlambat === '1'
    };
  }).sort(function(a, b) { return a.pekan - b.pekan; });

  return {
    user: user,
    bulan: bulan,
    tahun: tahun,
    bulanLabel: getBulanLabel(bulan),
    totalWeeks: n,
    rataRata: rataRata,
    predikat: predikat,
    summary: summary,
    weekSummaries: weekSummaries
  };
}

function getBulanLabel(bulan) {
  var names = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return names[bulan] || '';
}

function getPredikat(rataRata) {
  if (rataRata >= 90) return { label: 'Istimewa', level: 'A', color: 'success' };
  if (rataRata >= 80) return { label: 'Sangat Baik', level: 'B+', color: 'success' };
  if (rataRata >= 70) return { label: 'Baik', level: 'B', color: 'warning' };
  if (rataRata >= 60) return { label: 'Cukup', level: 'C', color: 'warning' };
  if (rataRata >= 50) return { label: 'Kurang', level: 'D', color: 'danger' };
  return { label: 'Perlu Perbaikan', level: 'E', color: 'danger' };
}

/**
 * Auto-generate monthly reports — run via time-based trigger
 * Meant to be triggered on the 1st of each month.
 * Stores results in rapor_bulanan sheet for caching.
 */
function autoGenerateMonthlyReports() {
  var now = new Date();
  // Previous month
  var bulan = now.getMonth(); // 0-based, so this IS prev month
  var tahun = now.getFullYear();
  if (bulan === 0) {
    bulan = 12;
    tahun--;
  }

  var usersSheet = getSheet('users');
  var usersData = usersSheet.getDataRange().getValues();
  var usersHeaders = usersData[0];
  var idCol = usersHeaders.indexOf('user_id');
  var roleCol = usersHeaders.indexOf('role');
  var statusCol = usersHeaders.indexOf('status');

  var raporSheet = getSheet('rapor_bulanan');
  ensureRaporHeaders(raporSheet);

  var generated = 0;
  for (var i = 1; i < usersData.length; i++) {
    var role = usersData[i][roleCol];
    if ((role === 'anggota' || role === 'pembina') && usersData[i][statusCol] === 'aktif') {
      var userId = usersData[i][idCol];
      var report = getMonthlyReport(userId, bulan, tahun);

      if (report && report.summary) {
        // Store in rapor_bulanan sheet
        var raporId = userId + '_' + tahun + '_' + bulan;
        var existingRow = findRaporRow(raporSheet, raporId);

        var rowData = [
          raporId,
          userId,
          report.user.nama,
          bulan,
          tahun,
          report.totalWeeks,
          report.rataRata,
          report.predikat.label,
          report.predikat.level,
          JSON.stringify(report.summary),
          JSON.stringify(report.weekSummaries),
          new Date().toISOString()
        ];

        if (existingRow > 0) {
          raporSheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
        } else {
          raporSheet.appendRow(rowData);
        }
        generated++;
      }
    }
  }

  Logger.log('Generated ' + generated + ' monthly reports for ' + getBulanLabel(bulan) + ' ' + tahun);
}

function ensureRaporHeaders(sheet) {
  var expectedHeaders = [
    'rapor_id', 'user_id', 'nama', 'bulan', 'tahun',
    'total_weeks', 'rata_rata', 'predikat_label', 'predikat_level',
    'summary_json', 'week_summaries_json', 'generated_at'
  ];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function findRaporRow(sheet, raporId) {
  if (sheet.getLastRow() <= 1) return -1;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === raporId) return i + 1;
  }
  return -1;
}
