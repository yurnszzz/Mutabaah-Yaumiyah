/**
 * ============================================
 * API Client - Frontend Integration Layer
 * ============================================
 * 
 * Handles communication with Google Apps Script backend.
 * Features:
 * - IndexedDB caching for offline/fast loading
 * - Retry logic with exponential backoff
 * - Request queuing for concurrent limit handling
 * - Stale-while-revalidate pattern
 */

// GAS Web App URL - set in .env as VITE_GAS_URL
const GAS_URL = import.meta.env.VITE_GAS_URL || '';

// ============ IndexedDB Cache ============

const DB_NAME = 'mutabaah_cache';
const DB_VERSION = 1;
const STORE_NAME = 'api_cache';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

async function getCached(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.expiresAt > Date.now()) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCached(key, data, ttlMs) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      key,
      data,
      expiresAt: Date.now() + ttlMs,
      cachedAt: Date.now(),
    });
  } catch {
    // Silently fail
  }
}

async function clearCache(keyPrefix) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.key.startsWith(keyPrefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch {
    // Silently fail
  }
}

// ============ HTTP Client (Performance Optimized) ============

const MAX_RETRIES = 2;  // Reduced from 3
const RETRY_DELAY_MS = 500; // Reduced from 1000

async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout (was 30s)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (err) {
      if (attempt === retries) throw err;

      // Shorter exponential backoff
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * GET request to GAS - with stale-while-revalidate for fast loading
 * Shows cached data immediately, refreshes in background
 */
async function apiGet(action, params = {}, cacheKey, cacheTtl) {
  if (!GAS_URL) {
    console.warn('[API] GAS_URL not configured, using mock data');
    return null;
  }

  const searchParams = new URLSearchParams({ action, ...params });
  const url = GAS_URL + '?' + searchParams.toString();

  // If cacheKey provided, try stale-while-revalidate
  if (cacheKey) {
    const cached = await getCached(cacheKey);
    if (cached) {
      // Return cached data immediately, refresh in background
      fetchWithRetry(url, {
        method: 'GET',
        headers: { 'Content-Type': 'text/plain' },
      }).then(fresh => {
        if (fresh) setCached(cacheKey, fresh, cacheTtl || CACHE_TTL.DASHBOARD);
      }).catch(() => {});
      return cached;
    }
  }

  const result = await fetchWithRetry(url, {
    method: 'GET',
    headers: { 'Content-Type': 'text/plain' },
  });

  if (cacheKey && result) {
    setCached(cacheKey, result, cacheTtl || CACHE_TTL.DASHBOARD);
  }

  return result;
}

/**
 * POST request to GAS
 */
async function apiPost(action, data = {}) {
  if (!GAS_URL) {
    console.warn('[API] GAS_URL not configured, using mock data');
    return null;
  }

  return fetchWithRetry(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, data }),
  });
}

// ============ API Methods ============

const CACHE_TTL = {
  USER: 6 * 60 * 60 * 1000,       // 6 hours
  DASHBOARD: 5 * 60 * 1000,       // 5 minutes (was 30)
  CURRENT_WEEK: 10 * 60 * 1000,   // 10 minutes (was 1 hour)
  HISTORY: 60 * 60 * 1000,        // 1 hour (was 2 hours)
};

/**
 * Login via Google OAuth - lookup user by email (GET, no password)
 * Uses stale-while-revalidate pattern
 */
export async function loginGoogle(email) {
  const cacheKey = 'login_' + email;

  const cached = await getCached(cacheKey);
  if (cached) {
    apiGet('login', { email }).then(fresh => {
      if (fresh && fresh.user) {
        setCached(cacheKey, fresh, CACHE_TTL.USER);
      }
    }).catch(() => {});
    return cached;
  }

  const result = await apiGet('login', { email });
  if (result && result.user) {
    setCached(cacheKey, result, CACHE_TTL.USER);
  }
  return result;
}

/**
 * Login manual - email + password (POST for security)
 * No caching for password-based login
 */
export async function loginManual(email, password) {
  return apiPost('loginManual', { email, password });
}

/**
 * Get dashboard data
 */
export async function getDashboard(userId) {
  const cacheKey = 'dashboard_' + userId;

  const cached = await getCached(cacheKey);
  if (cached) {
    apiGet('getDashboard', { userId }).then(fresh => {
      if (fresh && !fresh.error) {
        setCached(cacheKey, fresh, CACHE_TTL.DASHBOARD);
      }
    }).catch(() => {});
    return cached;
  }

  const result = await apiGet('getDashboard', { userId });
  if (result && !result.error) {
    setCached(cacheKey, result, CACHE_TTL.DASHBOARD);
  }
  return result;
}

/**
 * Get current week data
 */
export async function getCurrentWeek(userId, tahun, pekan) {
  const cacheKey = 'week_' + userId + '_' + tahun + '_' + pekan;

  const cached = await getCached(cacheKey);
  if (cached) {
    apiGet('getCurrentWeek', { userId, tahun, pekan }).then(fresh => {
      if (fresh && !fresh.error) {
        setCached(cacheKey, fresh, CACHE_TTL.CURRENT_WEEK);
      }
    }).catch(() => {});
    return cached;
  }

  const result = await apiGet('getCurrentWeek', { userId, tahun: String(tahun), pekan: String(pekan) });
  if (result && !result.error) {
    setCached(cacheKey, result, CACHE_TTL.CURRENT_WEEK);
  }
  return result;
}

/**
 * Submit mutabaah data
 */
export async function submitMutabaah(data) {
  const result = await apiPost('submitMutabaah', data);

  // Clear related caches
  if (result && !result.error) {
    await clearCache('dashboard_' + data.userId);
    await clearCache('week_' + data.userId);
    await clearCache('login_');
  }

  return result;
}

/**
 * Reset week data
 */
export async function resetWeek(userId, tahun, pekan) {
  const result = await apiPost('resetWeek', { userId, tahun, pekan });

  if (result && !result.error) {
    await clearCache('dashboard_' + userId);
    await clearCache('week_' + userId);
  }

  return result;
}

/**
 * Get history (paginated)
 */
export async function getHistory(userId, tahun, limit, offset) {
  const cacheKey = 'history_' + userId + '_' + tahun + '_' + limit + '_' + offset;

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const result = await apiGet('getHistory', {
    userId,
    tahun: String(tahun),
    limit: String(limit),
    offset: String(offset),
  });

  if (result && !result.error) {
    setCached(cacheKey, result, CACHE_TTL.HISTORY);
  }
  return result;
}

/**
 * Get group rekap (for pembina)
 */
export async function getGrupRekap(grupId, tahun, pekan) {
  return apiGet('getGrupRekap', { grupId, tahun: String(tahun), pekan: String(pekan) });
}

/**
 * Get all groups rekap (for yayasan)
 */
export async function getAllGrupRekap(tahun, pekan) {
  return apiGet('getAllGrupRekap', { tahun: String(tahun), pekan: String(pekan) });
}

/**
 * Self-registration (Google OAuth or manual with password)
 */
export async function register(email, nama, password, role, tingkatan, namaPembina, gender) {
  return apiPost('register', {
    email,
    nama,
    password: password || undefined,
    role: role || 'anggota',
    tingkatan: tingkatan || 'muda',
    namaPembina: namaPembina || undefined,
    gender: gender || 'ikhwan',
  });
}

/**
 * Change password (from Profile page)
 */
export async function changePassword(userId, oldPassword, newPassword) {
  return apiPost('changePassword', { userId, oldPassword, newPassword });
}

/**
 * Reset password (Lupa Password - sends temp password via email)
 */
export async function resetPassword(email) {
  return apiPost('resetPassword', { email });
}

// ============ Admin/Yayasan APIs ============

/**
 * Get all users (admin)
 */
export async function getAllUsers() {
  return apiGet('getAllUsers');
}

/**
 * Get all groups (admin)
 */
export async function getAllGroups() {
  return apiGet('getAllGroups');
}

/**
 * Get admin dashboard stats
 */
export async function getAdminStats() {
  return apiGet('getAdminStats');
}

/**
 * Delete user (admin)
 */
export async function deleteUser(userId) {
  return apiPost('deleteUser', { userId });
}

/**
 * Update user role (admin)
 */
export async function updateUserRole(userId, newRole) {
  return apiPost('updateUserRole', { userId, newRole });
}

// ============ Pembina APIs ============

/**
 * Get group members (pembina)
 */
export async function getGrupAnggota(grupId) {
  return apiGet('getGrupAnggota', { grupId });
}

/**
 * Get all groups managed by a pembina (multi-group)
 */
export async function getPembinaGroups(pembinaUserId) {
  return apiGet('getPembinaGroups', { pembinaUserId });
}

/**
 * Update profile (self-service name/email)
 */
export async function updateProfile(userId, nama, email) {
  return apiPost('updateProfile', { userId, nama, email });
}

// ============ Helpdesk APIs ============

/**
 * Create a support ticket
 */
export async function createTicket(data) {
  return apiPost('createTicket', data);
}

/**
 * Get my tickets (anggota/pembina)
 */
export async function getMyTickets(userId) {
  return apiGet('getMyTickets', { userId });
}

/**
 * Get all tickets (admin)
 */
export async function getAllTickets(statusFilter) {
  return apiGet('getAllTickets', { status: statusFilter || '' });
}

/**
 * Get ticket detail with replies
 */
export async function getTicketDetail(ticketId, userId, userRole) {
  return apiGet('getTicketDetail', { ticketId, userId, userRole });
}

/**
 * Reply to a ticket
 */
export async function replyTicket(data) {
  return apiPost('replyTicket', data);
}

/**
 * Update ticket status (admin)
 */
export async function updateTicketStatus(ticketId, status, resolvedBy) {
  return apiPost('updateTicketStatus', { ticketId, status, resolvedBy });
}

/**
 * Get helpdesk stats (admin)
 */
export async function getHelpdeskStats() {
  return apiGet('getHelpdeskStats');
}

/**
 * B6: Get member mutabaah history (pembina drill-down)
 */
export async function getMemberMutabaah(pembinaUserId, memberUserId, tahun, limit, offset) {
  return apiGet('getMemberMutabaah', {
    pembinaUserId, memberUserId,
    tahun: String(tahun || new Date().getFullYear()),
    limit: String(limit || 20),
    offset: String(offset || 0)
  });
}

/**
 * C1: Get leaderboard data
 */
export async function getLeaderboard(mode, tahun, pekan) {
  const params = { mode: mode || 'streak' };
  if (tahun) params.tahun = String(tahun);
  if (pekan) params.pekan = String(pekan);
  return apiGet('getLeaderboard', params);
}

/**
 * C2: Get monthly report data
 */
export async function getMonthlyReport(userId, bulan, tahun) {
  return apiGet('getMonthlyReport', {
    userId,
    bulan: String(bulan),
    tahun: String(tahun)
  });
}

// ============ UPA Notes ============

/**
 * Get all notes for a user (pembina)
 */
export async function getUpaNotes(userId) {
  return apiGet('getUpaNotes', { userId });
}

/**
 * Save (create or update) a note
 */
export async function saveUpaNote(data) {
  return apiPost('saveUpaNote', data);
}

/**
 * Delete a note
 */
export async function deleteUpaNote(data) {
  return apiPost('deleteUpaNote', data);
}

/**
 * Generic POST helper - exported for dynamic import in components
 */
export { apiPost };

/**
 * Check if API is configured
 */
export function isApiConfigured() {
  return !!GAS_URL;
}
