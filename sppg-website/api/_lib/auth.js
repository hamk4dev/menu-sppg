import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || '';
const TOKEN_TTL = 12 * 60 * 60 * 1000; // 12 jam

const b64u = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export function createToken(user) {
  const payload = { u: String(user), exp: Date.now() + TOKEN_TTL };
  const body = b64u(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

// Middleware: kembalikan payload admin atau kirim 401 (return null).
export function requireAdmin(req, res) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ ok: false, msg: 'Sesi berakhir. Silakan masuk kembali.' });
    return null;
  }
  return payload;
}

export function checkCredentials(user, pass) {
  const okUser = process.env.ADMIN_USER || '';
  const hashEnv = process.env.ADMIN_PASS_SHA256 || '';
  const salt = process.env.ADMIN_PASS_SALT || '';
  if (!okUser || !hashEnv || !user || !pass) return false;
  const hash = crypto.createHash('sha256').update(String(pass) + salt).digest('hex');
  const a = Buffer.from(hash), b = Buffer.from(hashEnv);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Rate-limit login sederhana: 5 percobaan / 5 menit per IP.
const attempts = new Map();
export function loginThrottled(ip) {
  const now = Date.now();
  let rec = attempts.get(ip);
  if (!rec || now > rec.reset) { rec = { count: 0, reset: now + 5 * 60 * 1000 }; }
  rec.count++;
  attempts.set(ip, rec);
  return rec.count > 5;
}
