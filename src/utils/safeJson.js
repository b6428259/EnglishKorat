// utils/safeJson.js
function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;

  const s = value.trim();
  // ถ้าไม่ได้ขึ้นต้นด้วย { หรือ [ ให้ถือว่าไม่ใช่ JSON
  if (!s.startsWith('{') && !s.startsWith('[')) return value;

  try {
    return JSON.parse(s);
  } catch {
    // ถ้า parse ไม่ได้ ให้คืนค่าเดิมเพื่อไม่ให้ endpoint พัง
    return value;
  }
}
module.exports = { safeJsonParse };
