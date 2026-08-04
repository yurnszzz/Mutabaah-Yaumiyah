/**
 * ============================================
 * Auth.gs - Authentication & User Lookup
 * ============================================
 */

/**
 * Hash password using SHA-256
 */
function hashPassword(password) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  return rawHash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Login user by email + password (manual login)
 * Password is optional for Google OAuth logins
 */
function loginUser(email, password) {
  if (!email) return { error: 'Email diperlukan' };

  var sheet = getSheet('users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('email');
  var passwordCol = headers.indexOf('password_hash');

  for (var i = 1; i < data.length; i++) {
    if (data[i][emailCol] && data[i][emailCol].toString().toLowerCase() === email.toLowerCase()) {
      var user = rowToObject(headers, data[i]);

      // If password provided, verify it
      if (password) {
        var storedHash = data[i][passwordCol] || '';
        if (!storedHash) {
          return { error: 'Akun ini terdaftar via Google. Silakan gunakan tombol "Sign in with Google".' };
        }
        var inputHash = hashPassword(password);
        if (inputHash !== storedHash) {
          return { error: 'Password salah. Silakan coba lagi.' };
        }
      }

      // Get group name
      if (user.grup_id) {
        var group = getGroupById(user.grup_id);
        if (group) {
          user.grup_nama = group.nama_grup;
        }
      }

      // Remove password_hash from response
      delete user.password_hash;

      // Cache for 6 hours
      var cacheKey = 'user_' + email;
      setCachedData(cacheKey, user, CACHE_DURATION);

      return { user: user };
    }
  }

  return { error: 'Email tidak terdaftar. Silakan daftar terlebih dahulu.', code: 'USER_NOT_FOUND' };
}

/**
 * Login via Google OAuth (no password needed, just email lookup)
 */
function loginGoogle(email) {
  if (!email) return { error: 'Email diperlukan' };

  var cacheKey = 'user_' + email;
  var cached = getCachedData(cacheKey);
  if (cached) return { user: cached };

  var sheet = getSheet('users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailCol = headers.indexOf('email');

  for (var i = 1; i < data.length; i++) {
    if (data[i][emailCol] && data[i][emailCol].toString().toLowerCase() === email.toLowerCase()) {
      var user = rowToObject(headers, data[i]);

      if (user.grup_id) {
        var group = getGroupById(user.grup_id);
        if (group) {
          user.grup_nama = group.nama_grup;
        }
      }

      delete user.password_hash;
      setCachedData(cacheKey, user, CACHE_DURATION);
      return { user: user };
    }
  }

  return { error: 'User tidak ditemukan', code: 'USER_NOT_FOUND' };
}

/**
 * Get user by ID
 */
function getUserById(userId) {
  if (!userId) return { error: 'User ID diperlukan' };

  var cacheKey = 'user_id_' + userId;
  var cached = getCachedData(cacheKey);
  if (cached) return { user: cached };

  var sheet = getSheet('users');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('user_id');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === userId) {
      var user = rowToObject(headers, data[i]);
      if (user.grup_id) {
        var group = getGroupById(user.grup_id);
        if (group) user.grup_nama = group.nama_grup;
      }
      delete user.password_hash;
      setCachedData(cacheKey, user, CACHE_DURATION);
      return { user: user };
    }
  }

  return { error: 'User tidak ditemukan' };
}

/**
 * Get group by ID
 */
function getGroupById(grupId) {
  var sheet = getSheet('groups');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('grup_id');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === grupId) {
      return rowToObject(headers, data[i]);
    }
  }
  return null;
}
