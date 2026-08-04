/**
 * ============================================
 * Admin.gs - Admin/Yayasan Functions
 * ============================================
 */

/**
 * Get all users with group names
 */
function getAllUsers() {
  var sheet = getSheet('users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var groupSheet = getSheet('groups');
  var groupData = groupSheet.getDataRange().getValues();
  var groupHeaders = groupData[0];
  var grupIdCol = groupHeaders.indexOf('grup_id');
  var namaGrupCol = groupHeaders.indexOf('nama_grup');
  
  // Build group name lookup
  var groupMap = {};
  for (var g = 1; g < groupData.length; g++) {
    groupMap[groupData[g][grupIdCol]] = groupData[g][namaGrupCol];
  }
  
  var users = [];
  for (var i = 1; i < data.length; i++) {
    var user = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] === 'password_hash') continue; // Don't expose
      user[headers[j]] = data[i][j];
    }
    user.grup_nama = groupMap[user.grup_id] || null;
    users.push(user);
  }
  
  return { users: users };
}

/**
 * Get all groups with pembina name and member count
 */
function getAllGroups() {
  var groupSheet = getSheet('groups');
  var groupData = groupSheet.getDataRange().getValues();
  var groupHeaders = groupData[0];
  
  var userSheet = getSheet('users');
  var userData = userSheet.getDataRange().getValues();
  var userHeaders = userData[0];
  var userGrupCol = userHeaders.indexOf('grup_id');
  var userNameCol = userHeaders.indexOf('nama');
  var userIdCol = userHeaders.indexOf('user_id');
  var userRoleCol = userHeaders.indexOf('role');
  var userStatusCol = userHeaders.indexOf('status');
  
  // Count members per group (only anggota) and find pembina name
  var memberCount = {};
  var userMap = {};
  for (var u = 1; u < userData.length; u++) {
    var gid = userData[u][userGrupCol];
    if (gid && userData[u][userStatusCol] === 'aktif' && userData[u][userRoleCol] === 'anggota') {
      memberCount[gid] = (memberCount[gid] || 0) + 1;
    }
    userMap[userData[u][userIdCol]] = userData[u][userNameCol];
  }
  
  var groups = [];
  for (var i = 1; i < groupData.length; i++) {
    var group = {};
    for (var j = 0; j < groupHeaders.length; j++) {
      group[groupHeaders[j]] = groupData[i][j];
    }
    group.pembina_nama = userMap[group.pembina_user_id] || 'Belum ditentukan';
    group.jumlah_anggota = memberCount[group.grup_id] || 0;
    groups.push(group);
  }
  
  return { groups: groups };
}

/**
 * Get admin dashboard stats
 */
function getAdminStats() {
  var userSheet = getSheet('users');
  var userData = userSheet.getDataRange().getValues();
  var userHeaders = userData[0];
  var roleCol = userHeaders.indexOf('role');
  var statusCol = userHeaders.indexOf('status');
  
  var groupSheet = getSheet('groups');
  var groupCount = Math.max(0, groupSheet.getLastRow() - 1);
  
  var totalAnggota = 0;
  var totalPembina = 0;
  var totalYayasan = 0;
  var totalAktif = 0;
  
  for (var i = 1; i < userData.length; i++) {
    var role = userData[i][roleCol];
    var status = userData[i][statusCol];
    if (status === 'aktif') totalAktif++;
    if (role === 'anggota') totalAnggota++;
    else if (role === 'pembina') totalPembina++;
    else if (role === 'yayasan') totalYayasan++;
  }
  
  return {
    totalUser: userData.length - 1,
    totalAnggota: totalAnggota,
    totalPembina: totalPembina,
    totalYayasan: totalYayasan,
    totalAktif: totalAktif,
    totalGrup: groupCount,
  };
}

/**
 * Delete a user (admin only)
 */
function deleteUser(data) {
  if (!data.userId) return { error: 'userId diperlukan' };
  
  var sheet = getSheet('users');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = headers.indexOf('user_id');
  
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.userId) {
      sheet.deleteRow(i + 1);
      CacheService.getScriptCache().remove('user_' + allData[i][headers.indexOf('email')]);
      return { message: 'User berhasil dihapus' };
    }
  }
  return { error: 'User tidak ditemukan' };
}

/**
 * Update user role (admin only)
 */
function updateUserRole(data) {
  if (!data.userId || !data.newRole) return { error: 'userId dan newRole diperlukan' };
  
  var validRoles = ['anggota', 'pembina', 'yayasan'];
  if (validRoles.indexOf(data.newRole) === -1) {
    return { error: 'Role tidak valid' };
  }
  
  var sheet = getSheet('users');
  var allData = sheet.getDataRange().getValues();
  var headers = allData[0];
  var idCol = headers.indexOf('user_id');
  var roleCol = headers.indexOf('role');
  
  for (var i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === data.userId) {
      sheet.getRange(i + 1, roleCol + 1).setValue(data.newRole);
      CacheService.getScriptCache().remove('user_' + allData[i][headers.indexOf('email')]);
      return { message: 'Role berhasil diubah menjadi ' + data.newRole };
    }
  }
  return { error: 'User tidak ditemukan' };
}
