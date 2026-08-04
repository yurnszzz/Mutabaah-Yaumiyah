/**
 * ============================================
 * Utils.gs - Helper Functions
 * ============================================
 */

/**
 * Convert a row array to an object using headers
 */
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    if (h) obj[h] = row[i] !== undefined ? row[i] : '';
  });
  return obj;
}

/**
 * Get week info (server-side)
 * Returns: { weekNumber, year, monday, sunday, label }
 */
function getWeekInfoServer(date) {
  const d = date ? new Date(date) : new Date();

  // Adjust to WIB (UTC+7)
  const wib = new Date(d.getTime() + (7 * 60 * 60 * 1000));

  // Get Monday of this week
  const day = wib.getUTCDay();
  const diff = wib.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(wib);
  monday.setUTCDate(diff);
  monday.setUTCHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  // Week number (ISO)
  const startOfYear = new Date(monday.getUTCFullYear(), 0, 1);
  const weekNum = Math.ceil(((monday - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);

  // Label format
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const label = monday.getUTCDate() + ' ' + months[monday.getUTCMonth()] + ' - ' +
                sunday.getUTCDate() + ' ' + months[sunday.getUTCMonth()] + ' ' + monday.getUTCFullYear();

  return {
    weekNumber: weekNum,
    year: monday.getUTCFullYear(),
    monday,
    sunday,
    label,
  };
}

// ============ CACHING ============

/**
 * Get cached data from CacheService
 */
function getCachedData(key) {
  try {
    const cache = CacheService.getScriptCache();
    const raw = cache.get(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Cache miss or parse error - silently ignore
  }
  return null;
}

/**
 * Set cached data to CacheService
 * Max duration: 21600 seconds (6 hours)
 */
function setCachedData(key, data, duration) {
  try {
    const cache = CacheService.getScriptCache();
    const json = JSON.stringify(data);
    // CacheService has a 100KB limit per value
    if (json.length < 100000) {
      cache.put(key, json, Math.min(duration || CACHE_DURATION, 21600));
    }
  } catch (e) {
    // Cache write error - silently ignore
  }
}

// ============ UUID GENERATOR ============

/**
 * Generate a simple UUID (if Utilities.getUuid is not available in older GAS)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============ DATE HELPERS ============

/**
 * Check if current time is past deadline for a week
 * Deadline: Sunday 23:59 WIB
 */
function isPastDeadline(weekInfo) {
  const now = new Date();
  const deadline = new Date(weekInfo.sunday);
  deadline.setHours(23, 59, 59, 999);
  return now > deadline;
}

/**
 * Format date to Indonesian locale
 */
function formatDateID(date) {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}
