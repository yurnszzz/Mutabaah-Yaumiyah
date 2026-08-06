/**
 * ============================================
 * Users.gs - User Management
 * ============================================
 */

/**
 * Create new user
 */
function createUser(data) {
  if (!data.email || !data.nama) {
    return { error: 'Email dan nama diperlukan' };
  }

  // Check duplicate email
  var existing = loginGoogle(data.email);
  if (existing.user) {
    return { error: 'Email sudah terdaftar' };
  }

  var sheet = getSheet('users');
  var userId = 'usr_' + Utilities.getUuid().substring(0, 8);
  var now = new Date().toISOString();
  var passwordHash = data.password ? hashPassword(data.password) : '';

  sheet.appendRow([
    userId,
    data.email,
    passwordHash,
    data.nama,
    data.role || 'anggota',
    data.tingkatan || 'muda',
    data.grupId || '',
    'aktif',
    '', // transisi_dari
    '', // transisi_mulai
    '', // transisi_durasi_pekan
    0,  // streak_current
    0,  // streak_longest
    '[]', // badges
    data.noWhatsapp || '',
    now,
    data.gender || 'ikhwan',
  ]);

  // If pembina, update group
  if (data.role === 'pembina' && data.grupId) {
    updateGroupPembina(data.grupId, userId);
  }

  return {
    message: 'User berhasil dibuat',
    userId,
    user: {
      user_id: userId,
      email: data.email,
      nama: data.nama,
      role: data.role || 'anggota',
      tingkatan: data.tingkatan || 'muda',
      grup_id: data.grupId || '',
      status: 'aktif',
      gender: data.gender || 'ikhwan',
    }
  };
}

/**
 * Ensure the groups sheet has proper headers.
 * Fixes the bug where data was written without headers.
 */
function ensureGroupHeaders(groupSheet) {
  var expectedHeaders = ['grup_id', 'nama_grup', 'pembina_user_id', 'created_at'];
  if (groupSheet.getLastRow() === 0) {
    // Empty sheet - add headers
    groupSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    groupSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    groupSheet.setFrozenRows(1);
    return;
  }
  // Check if row 1 looks like headers
  var firstRow = groupSheet.getRange(1, 1, 1, Math.max(groupSheet.getLastColumn(), 4)).getValues()[0];
  if (firstRow[0] !== 'grup_id') {
    // Row 1 is data, not headers - insert header row
    groupSheet.insertRowBefore(1);
    groupSheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    groupSheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    groupSheet.setFrozenRows(1);
  }
}

/**
 * Find group by pembina name (case-insensitive).
 * Handles Ust./Ustadzah prefix stripping for flexible matching.
 * Also searches by actual pembina user name in users sheet.
 */
function findGroupByPembinaName(pembinaName) {
  if (!pembinaName) return null;
  var inputLower = pembinaName.trim().toLowerCase();

  // Strip gelar helper
  var gelars = ['ust. ', 'ust.', 'ustadz ', 'ustadzah ', 'ustad '];
  function stripGelar(name) {
    var n = name.toLowerCase().trim();
    for (var g = 0; g < gelars.length; g++) {
      if (n.startsWith(gelars[g])) {
        return n.substring(gelars[g].length).trim();
      }
    }
    return n;
  }

  // Get the "core" name (without gelar) and full name variants
  var inputCore = stripGelar(inputLower);
  var inputVariants = [inputLower, inputCore];
  // Also add variants with each gelar prefix
  inputVariants.push('ust. ' + inputCore);
  inputVariants.push('ustadzah ' + inputCore);

  // Helper: check if two names match (either full or core)
  function namesMatch(name1, name2) {
    var n1 = name1.toLowerCase().trim();
    var n2 = name2.toLowerCase().trim();
    if (n1 === n2) return true;
    // Compare core names (stripped of gelar)
    var core1 = stripGelar(n1);
    var core2 = stripGelar(n2);
    if (core1 === core2 && core1.length > 0) return true;
    return false;
  }

  var groupSheet = getSheet('groups');
  ensureGroupHeaders(groupSheet);

  var groupData = groupSheet.getDataRange().getValues();
  var groupHeaders = groupData[0];
  var namaCol = groupHeaders.indexOf('nama_grup');
  var grupIdCol = groupHeaders.indexOf('grup_id');
  var pembinaUserIdCol = groupHeaders.indexOf('pembina_user_id');

  // Method 1: Match by nama_grup directly
  for (var i = 1; i < groupData.length; i++) {
    var grupNama = (groupData[i][namaCol] || '').toString().trim();
    if (namesMatch(grupNama, pembinaName)) {
      return { grupId: groupData[i][grupIdCol], grupNama: grupNama };
    }
  }

  // Method 2: Match by actual pembina user's nama in users sheet
  var userSheet = getSheet('users');
  var userData = userSheet.getDataRange().getValues();
  var userHeaders = userData[0];
  var userIdCol = userHeaders.indexOf('user_id');
  var userNamaCol = userHeaders.indexOf('nama');

  for (var i = 1; i < groupData.length; i++) {
    var pembinaUserId = groupData[i][pembinaUserIdCol];
    if (!pembinaUserId) continue;
    for (var j = 1; j < userData.length; j++) {
      if (userData[j][userIdCol] === pembinaUserId) {
        var pembinaUserName = (userData[j][userNamaCol] || '').toString().trim();
        if (namesMatch(pembinaUserName, pembinaName)) {
          return { 
            grupId: groupData[i][grupIdCol], 
            grupNama: groupData[i][namaCol] || pembinaUserName 
          };
        }
        break; // found the pembina user, no need to keep searching
      }
    }
  }

  return null;
}

/**
 * Self-registration (Google OAuth or manual with password)
 * - Pembina: auto-creates a group named after them
 * - Anggota: auto-joins group matching namaPembina (case-insensitive)
 * - Yayasan: admin-only, cannot self-register
 */
function registerSelf(data) {
  if (!data.email || !data.nama) {
    return { error: 'Email dan nama diperlukan' };
  }

  // Check if already registered
  var existing = loginGoogle(data.email);
  if (existing.user) {
    return { error: 'Email sudah terdaftar. Silakan masuk.' };
  }

  // Validate role
  var role = data.role || 'anggota';
  if (role === 'yayasan') {
    return { error: 'Akun yayasan tidak bisa didaftarkan sendiri. Hubungi admin.' };
  }
  if (role !== 'anggota' && role !== 'pembina') {
    role = 'anggota';
  }

  // Tingkatan only for anggota
  var tingkatan = '';
  if (role === 'anggota') {
    tingkatan = data.tingkatan || 'muda';
    if (['muda', 'madya', 'pratama'].indexOf(tingkatan) === -1) {
      tingkatan = 'muda';
    }
  }

  // Hash password
  var passwordHash = '';
  if (data.password) {
    if (data.password.length < 6) {
      return { error: 'Password minimal 6 karakter' };
    }
    passwordHash = hashPassword(data.password);
  }

  var sheet = getSheet('users');
  var userId = 'usr_' + Utilities.getUuid().substring(0, 8);
  var now = new Date().toISOString();
  var grupId = '';
  var grupNama = null;
  var message = '';

  if (role === 'pembina') {
    // === PEMBINA: Auto-create group ===
    grupId = 'grp_' + Utilities.getUuid().substring(0, 8);
    grupNama = data.nama; // Group named after pembina

    var groupSheet = getSheet('groups');
    ensureGroupHeaders(groupSheet);
    groupSheet.appendRow([grupId, grupNama, userId, now]);

    message = 'Pendaftaran berhasil sebagai Pembina! Grup "' + grupNama + '" telah dibuat otomatis.';
  } else {
    // === ANGGOTA: Must specify pembina name ===
    if (!data.namaPembina || !data.namaPembina.trim()) {
      return { error: 'Nama pembina wajib diisi untuk pendaftaran anggota.' };
    }
    var found = findGroupByPembinaName(data.namaPembina);
    if (found) {
      grupId = found.grupId;
      grupNama = found.grupNama;
      message = 'Pendaftaran berhasil! Anda masuk ke grup "' + grupNama + '".';
    } else {
      return { error: 'Pembina "' + data.namaPembina.trim() + '" belum terdaftar di sistem. Hubungi admin untuk informasi lebih lanjut.' };
    }
  }

  sheet.appendRow([
    userId,
    data.email,
    passwordHash,
    data.nama,
    role,
    tingkatan,
    grupId,
    'aktif',
    '',     // transisi_dari
    '',     // transisi_mulai
    '',     // transisi_durasi_pekan
    0,      // streak_current
    0,      // streak_longest
    '[]',   // badges
    data.noWhatsapp || '',
    now,
    data.gender || 'ikhwan',
  ]);

  CacheService.getScriptCache().remove('user_' + data.email);

  return {
    message: message,
    isNewUser: true,
    user: {
      user_id: userId,
      email: data.email,
      nama: data.nama,
      role: role,
      tingkatan: tingkatan,
      grup_id: grupId,
      grup_nama: grupNama,
      status: 'aktif',
      gender: data.gender || 'ikhwan',
    }
  };
}

/**
 * Change password (from Profil page)
 */
function changePassword(data) {
  if (!data.userId || !data.newPassword) {
    return { error: 'Data tidak lengkap' };
  }
  if (data.newPassword.length < 6) {
    return { error: 'Password baru minimal 6 karakter' };
  }

  var sheet = getSheet('users');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = headers.indexOf('user_id');
  var pwCol = headers.indexOf('password_hash');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.userId) {
      var storedHash = allData[i][pwCol] || '';

      // If password set, verify old password
      if (storedHash && data.oldPassword && hashPassword(data.oldPassword) !== storedHash) {
        return { error: 'Password lama salah' };
      }

      sheet.getRange(i + 1, pwCol + 1).setValue(hashPassword(data.newPassword));
      return { message: 'Password berhasil diubah' };
    }
  }
  return { error: 'User tidak ditemukan' };
}

/**
 * Reset password (Lupa Password) - sends temp password via email
 */
function resetPassword(data) {
  if (!data.email) {
    return { error: 'Email diperlukan' };
  }

  var sheet = getSheet('users');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var emailCol = headers.indexOf('email');
  var pwCol = headers.indexOf('password_hash');
  var namaCol = headers.indexOf('nama');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][emailCol] && allData[i][emailCol].toString().toLowerCase() === data.email.toLowerCase()) {
      // Generate temporary password
      var tempPassword = 'temp' + Math.floor(100000 + Math.random() * 900000);

      // Update password in sheet
      sheet.getRange(i + 1, pwCol + 1).setValue(hashPassword(tempPassword));

      // Send email
      try {
        MailApp.sendEmail({
          to: data.email,
          subject: 'Reset Password - Mutabaah Yaumiyah',
          htmlBody: '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">'
            + '<h2 style="color:#2a9d8f">Mutabaah Yaumiyah</h2>'
            + '<p>Assalamu\'alaikum ' + allData[i][namaCol] + ',</p>'
            + '<p>Password Anda telah direset. Gunakan password sementara berikut untuk masuk:</p>'
            + '<div style="background:#f0f0f0;padding:15px;border-radius:8px;text-align:center;font-size:24px;font-weight:bold;letter-spacing:2px;margin:16px 0">'
            + tempPassword
            + '</div>'
            + '<p>Setelah masuk, segera ubah password Anda melalui halaman Profil.</p>'
            + '<p style="color:#888;font-size:12px;margin-top:20px">SIT Matahari - Mutabaah Yaumiyah</p>'
            + '</div>'
        });
      } catch (err) {
        return { error: 'Gagal mengirim email: ' + err.message };
      }

      // Clear cache
      CacheService.getScriptCache().remove('user_' + data.email);
      return { message: 'Password sementara telah dikirim ke email Anda.' };
    }
  }
  return { error: 'Email tidak terdaftar' };
}

/**
 * Update user data (general)
 */
function updateUser(data) {
  if (!data.userId) return { error: 'userId diperlukan' };

  const sheet = getSheet('users');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idCol = headers.indexOf('user_id');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.userId) {
      // Update only provided fields
      const updateFields = ['nama', 'email', 'role', 'tingkatan', 'grup_id', 'status', 'no_whatsapp'];
      const fieldMap = { noWhatsapp: 'no_whatsapp', grupId: 'grup_id' };

      updateFields.forEach(field => {
        const dataKey = Object.entries(fieldMap).find(([k, v]) => v === field)?.[0] || field;
        if (data[dataKey] !== undefined) {
          const col = headers.indexOf(field);
          if (col >= 0) {
            sheet.getRange(i + 1, col + 1).setValue(data[dataKey]);
          }
        }
      });

      // Clear cache
      const cache = CacheService.getScriptCache();
      cache.removeAll(['user_id_' + data.userId, 'user_' + allData[i][headers.indexOf('email')]]);

      return { message: 'User berhasil diupdate' };
    }
  }

  return { error: 'User tidak ditemukan' };
}

/**
 * Update profile (name/email) - self-service
 */
function updateProfile(data) {
  if (!data.userId) return { error: 'userId diperlukan' };

  var sheet = getSheet('users');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = headers.indexOf('user_id');
  var emailCol = headers.indexOf('email');
  var namaCol = headers.indexOf('nama');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.userId) {
      var oldEmail = allData[i][emailCol];

      // Update nama
      if (data.nama && data.nama.trim()) {
        sheet.getRange(i + 1, namaCol + 1).setValue(data.nama.trim());
      }

      // Update email (check uniqueness)
      if (data.email && data.email.trim() && data.email.trim().toLowerCase() !== oldEmail.toLowerCase()) {
        // Check if new email already exists
        for (var j = 1; j < allData.length; j++) {
          if (j !== i && allData[j][emailCol] && allData[j][emailCol].toString().toLowerCase() === data.email.trim().toLowerCase()) {
            return { error: 'Email sudah digunakan oleh user lain' };
          }
        }
        sheet.getRange(i + 1, emailCol + 1).setValue(data.email.trim());
      }

      // Clear caches
      var cache = CacheService.getScriptCache();
      cache.remove('user_' + oldEmail);
      if (data.email) cache.remove('user_' + data.email.trim());

      return {
        message: 'Profil berhasil diperbarui',
        user: {
          user_id: data.userId,
          nama: data.nama || allData[i][namaCol],
          email: data.email || allData[i][emailCol],
        }
      };
    }
  }
  return { error: 'User tidak ditemukan' };
}

/**
 * Get all members of a group
 */
function getGrupAnggota(grupId) {
  if (!grupId) return { error: 'grupId diperlukan' };

  const cacheKey = 'grup_anggota_' + grupId;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const sheet = getSheet('users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const grupCol = headers.indexOf('grup_id');
  const statusCol = headers.indexOf('status');
  const roleCol = headers.indexOf('role');

  const members = [];
  for (let i = 1; i < data.length; i++) {
    // Only include anggota — exclude pembina/yayasan from the member list
    if (data[i][grupCol] === grupId && data[i][statusCol] === 'aktif' && data[i][roleCol] === 'anggota') {
      members.push(rowToObject(headers, data[i]));
    }
  }

  // Also check weekly submission status
  var tahun = new Date().getFullYear();
  var wi = getWeekInfoServer();
  var pekan = wi.weekNumber;
  
  var anggota = members.map(function(m) {
    var weekData = null;
    try {
      weekData = getCurrentWeekData(m.user_id, tahun, pekan);
    } catch(e) {}
    return {
      user_id: m.user_id,
      nama: m.nama,
      email: m.email,
      tingkatan: m.tingkatan,
      status: m.status,
      streak_current: m.streak_current || 0,
      streak_longest: m.streak_longest || 0,
      sudah_isi: weekData ? weekData.exists : false,
      persen_rata_rata: weekData && weekData.record ? (weekData.record.persen_rata_rata || 0) : 0,
    };
  });

  var result = { anggota: anggota, total: anggota.length };
  setCachedData(cacheKey, result, 300); // 5 min cache
  return result;
}

/**
 * Get group rekap (for pembina dashboard)
 */
function getGrupRekap(grupId, tahun, pekan) {
  if (!grupId) return { error: 'grupId diperlukan' };

  tahun = tahun || new Date().getFullYear();
  if (!pekan) {
    const wi = getWeekInfoServer();
    pekan = wi.weekNumber;
  }

  // Get members
  const membersResult = getGrupAnggota(grupId);
  const members = membersResult.anggota || [];

  var sudahIsi = members.filter(function(m) { return m.sudah_isi; }).length;
  var belumIsi = members.filter(function(m) { return !m.sudah_isi; }).length;

  // Calculate average percentages
  var totalPersen = 0;
  var filledCount = 0;
  members.forEach(function(m) {
    if (m.sudah_isi && m.persen_rata_rata) {
      totalPersen += m.persen_rata_rata;
      filledCount++;
    }
  });

  return {
    grupId: grupId,
    pekan: pekan,
    tahun: tahun,
    members: members,
    sudahIsi: sudahIsi,
    belumIsi: belumIsi,
    totalAnggota: members.length,
    rataRata: filledCount > 0 ? Math.round(totalPersen / filledCount) : 0,
  };
}

/**
 * Get all groups rekap (for yayasan dashboard)
 */
function getAllGrupRekap(tahun, pekan) {
  tahun = tahun || new Date().getFullYear();
  if (!pekan) {
    const wi = getWeekInfoServer();
    pekan = wi.weekNumber;
  }

  var groupsSheet = getSheet('groups');
  ensureGroupHeaders(groupsSheet);
  var groupsData = groupsSheet.getDataRange().getValues();
  var groupsHeaders = groupsData[0];

  var results = [];
  for (var i = 1; i < groupsData.length; i++) {
    var group = rowToObject(groupsHeaders, groupsData[i]);
    var rekap = getGrupRekap(group.grup_id, tahun, pekan);
    results.push({
      grup_id: group.grup_id,
      nama_grup: group.nama_grup,
      pembina_user_id: group.pembina_user_id,
      totalAnggota: rekap.totalAnggota,
      sudahIsi: rekap.sudahIsi,
      belumIsi: rekap.belumIsi,
      rataRata: rekap.rataRata,
    });
  }

  return { groups: results, tahun: tahun, pekan: pekan };
}

function updateGroupPembina(grupId, userId) {
  const sheet = getSheet('groups');
  ensureGroupHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('grup_id');
  const pembinaCol = headers.indexOf('pembina_user_id');

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === grupId) {
      sheet.getRange(i + 1, pembinaCol + 1).setValue(userId);
      break;
    }
  }
}

/**
 * B6: Get mutabaah history for a specific member (pembina drill-down).
 * Server-side permission: pembina's grup_id must match member's grup_id.
 */
function getMemberMutabaah(pembinaUserId, memberUserId, tahun, limit, offset) {
  if (!pembinaUserId || !memberUserId) {
    return { error: 'pembinaUserId dan memberUserId diperlukan' };
  }

  // Permission check: verify both users are in the same group
  var usersSheet = getSheet('users');
  var usersData = usersSheet.getDataRange().getValues();
  var usersHeaders = usersData[0];
  var idCol = usersHeaders.indexOf('user_id');
  var grupCol = usersHeaders.indexOf('grup_id');
  var roleCol = usersHeaders.indexOf('role');

  var pembinaGrup = null;
  var memberGrup = null;
  var memberInfo = null;
  var pembinaRole = null;

  for (var i = 1; i < usersData.length; i++) {
    if (usersData[i][idCol] === pembinaUserId) {
      pembinaGrup = usersData[i][grupCol];
      pembinaRole = usersData[i][roleCol];
    }
    if (usersData[i][idCol] === memberUserId) {
      memberGrup = usersData[i][grupCol];
      memberInfo = rowToObject(usersHeaders, usersData[i]);
    }
  }

  // Only pembina/yayasan can access
  if (pembinaRole !== 'pembina' && pembinaRole !== 'yayasan') {
    return { error: 'Akses ditolak: hanya pembina atau yayasan' };
  }

  // Pembina can only access their own group (yayasan can access all)
  if (pembinaRole === 'pembina' && pembinaGrup !== memberGrup) {
    return { error: 'Akses ditolak: anggota bukan bagian dari grup Anda' };
  }

  if (!memberInfo) {
    return { error: 'Anggota tidak ditemukan' };
  }

  // Fetch history using existing function
  var history = getHistory(memberUserId, tahun, limit || 20, offset || 0);

  // Remove password hash from member info
  delete memberInfo.password_hash;

  return {
    member: memberInfo,
    records: history.records || [],
    total: history.total || 0,
    hasMore: history.hasMore || false
  };
}

/**
 * C1: Leaderboard — get ranking data for all active anggota
 * Modes: 'streak' (streak_current) or 'score' (average persen_rata_rata this week)
 */
function getLeaderboard(mode, tahun, pekan) {
  mode = mode || 'streak';
  
  var usersSheet = getSheet('users');
  var usersData = usersSheet.getDataRange().getValues();
  var usersHeaders = usersData[0];
  var idCol = usersHeaders.indexOf('user_id');
  var namaCol = usersHeaders.indexOf('nama');
  var roleCol = usersHeaders.indexOf('role');
  var statusCol = usersHeaders.indexOf('status');
  var streakCol = usersHeaders.indexOf('streak_current');
  var longestCol = usersHeaders.indexOf('streak_longest');
  var grupCol = usersHeaders.indexOf('grup_id');
  var tingkatanCol = usersHeaders.indexOf('tingkatan');

  // Collect active anggota + pembina
  var users = [];
  for (var i = 1; i < usersData.length; i++) {
    var role = usersData[i][roleCol];
    if ((role === 'anggota' || role === 'pembina') && usersData[i][statusCol] === 'aktif') {
      users.push({
        user_id: usersData[i][idCol],
        nama: usersData[i][namaCol],
        role: role,
        tingkatan: usersData[i][tingkatanCol] || '',
        streak_current: parseInt(usersData[i][streakCol]) || 0,
        streak_longest: parseInt(usersData[i][longestCol]) || 0,
        grup_id: usersData[i][grupCol] || '',
        score: 0 // populated below for 'score' mode
      });
    }
  }

  if (mode === 'score') {
    // Get current week scores
    tahun = tahun || new Date().getFullYear();
    if (!pekan) {
      var wi = getWeekInfoServer();
      pekan = wi.weekNumber;
    }
    var sheetName = 'mutabaah_' + tahun;
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet && sheet.getLastRow() > 1) {
      var allData = sheet.getDataRange().getValues();
      var headers = allData[0];
      var mUserIdCol = headers.indexOf('user_id');
      var mPekanCol = headers.indexOf('pekan_ke');
      var mRataCol = headers.indexOf('persen_rata_rata');
      
      var scoreMap = {};
      for (var j = 1; j < allData.length; j++) {
        if (parseInt(allData[j][mPekanCol]) === parseInt(pekan)) {
          scoreMap[allData[j][mUserIdCol]] = parseInt(allData[j][mRataCol]) || 0;
        }
      }
      
      users.forEach(function(u) {
        u.score = scoreMap[u.user_id] || 0;
      });
    }
    
    // Sort by score desc, then by streak as tiebreaker
    users.sort(function(a, b) {
      return b.score - a.score || b.streak_current - a.streak_current;
    });
  } else {
    // Sort by streak_current desc, then streak_longest
    users.sort(function(a, b) {
      return b.streak_current - a.streak_current || b.streak_longest - a.streak_longest;
    });
  }

  // Assign ranks (handle ties)
  for (var k = 0; k < users.length; k++) {
    var sortVal = mode === 'score' ? users[k].score : users[k].streak_current;
    if (k > 0) {
      var prevVal = mode === 'score' ? users[k-1].score : users[k-1].streak_current;
      users[k].rank = sortVal === prevVal ? users[k-1].rank : k + 1;
    } else {
      users[k].rank = 1;
    }
  }

  return {
    mode: mode,
    total: users.length,
    leaderboard: users
  };
}

// ============ Group Management (Admin) ============

/**
 * Create a new group
 */
function createGroup(data) {
  if (!data.nama_grup) return { error: 'Nama grup diperlukan' };

  var groupSheet = getSheet('groups');
  ensureGroupHeaders(groupSheet);

  var grupId = 'grp_' + Utilities.getUuid().substring(0, 8);
  var now = new Date().toISOString();

  groupSheet.appendRow([grupId, data.nama_grup, data.pembina_user_id || '', now]);

  return { message: 'Grup "' + data.nama_grup + '" berhasil dibuat', grup_id: grupId };
}

/**
 * Update group name/pembina
 */
function updateGroup(data) {
  if (!data.grup_id) return { error: 'grup_id diperlukan' };

  var groupSheet = getSheet('groups');
  ensureGroupHeaders(groupSheet);
  var allData = groupSheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = headers.indexOf('grup_id');
  var namaCol = headers.indexOf('nama_grup');
  var pembinaCol = headers.indexOf('pembina_user_id');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.grup_id) {
      if (data.nama_grup) groupSheet.getRange(i + 1, namaCol + 1).setValue(data.nama_grup);
      if (data.pembina_user_id !== undefined) groupSheet.getRange(i + 1, pembinaCol + 1).setValue(data.pembina_user_id);
      return { message: 'Grup berhasil diperbarui' };
    }
  }
  return { error: 'Grup tidak ditemukan' };
}

/**
 * Delete a group (unassign all members)
 */
function deleteGroup(data) {
  if (!data.grup_id) return { error: 'grup_id diperlukan' };

  // Unassign all members
  var userSheet = getSheet('users');
  var userData = userSheet.getDataRange().getValues();
  var uHeaders = userData[0];
  var grupCol = uHeaders.indexOf('grup_id');

  for (var i = 1; i < userData.length; i++) {
    if (userData[i][grupCol] === data.grup_id) {
      userSheet.getRange(i + 1, grupCol + 1).setValue('');
    }
  }

  // Delete group row
  var groupSheet = getSheet('groups');
  ensureGroupHeaders(groupSheet);
  var gData = groupSheet.getDataRange().getValues();
  var gHeaders = gData[0];
  var gIdCol = gHeaders.indexOf('grup_id');

  for (var j = gData.length - 1; j >= 1; j--) {
    if (gData[j][gIdCol] === data.grup_id) {
      groupSheet.deleteRow(j + 1);
      break;
    }
  }

  return { message: 'Grup berhasil dihapus' };
}

/**
 * Add member to group
 */
function addMemberToGroup(data) {
  if (!data.grup_id || !data.user_id) return { error: 'grup_id dan user_id diperlukan' };

  var sheet = getSheet('users');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = headers.indexOf('user_id');
  var grupCol = headers.indexOf('grup_id');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.user_id) {
      sheet.getRange(i + 1, grupCol + 1).setValue(data.grup_id);
      return { message: 'Anggota berhasil ditambahkan ke grup' };
    }
  }
  return { error: 'User tidak ditemukan' };
}

/**
 * Remove member from group
 */
function removeMemberFromGroup(data) {
  if (!data.user_id) return { error: 'user_id diperlukan' };

  var sheet = getSheet('users');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = headers.indexOf('user_id');
  var grupCol = headers.indexOf('grup_id');

  for (var i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.user_id) {
      sheet.getRange(i + 1, grupCol + 1).setValue('');
      return { message: 'Anggota berhasil dikeluarkan dari grup' };
    }
  }
  return { error: 'User tidak ditemukan' };
}
