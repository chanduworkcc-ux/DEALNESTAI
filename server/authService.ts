import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SecretCodeRecord {
  id: string;
  code: string;
  codeHash: string;
  salt: string;
  status: 'active' | 'used' | 'disabled' | 'revoked';
  createdAt: number;
  usedAt: number | null;
  usedBy: string | null;
  note: string;
}

export interface SessionRecord {
  token: string;
  type: 'admin' | 'user';
  createdAt: number;
  expiresAt: number;
  codeId?: string;
  userLabel?: string;
}

export interface AuthDatabase {
  admin: {
    hash: string;
    salt: string;
    needsChange: boolean;
    lastChanged: number;
  };
  secretCodes: SecretCodeRecord[];
  sessions: SessionRecord[];
}

const DB_FILE = path.join(__dirname, '..', 'data', 'auth_db.json');

// Helper to hash with salt using SHA-256
export function hashWithSalt(input: string, salt: string): string {
  return crypto.createHash('sha256').update(salt + ':' + input).digest('hex');
}

// Helper to generate random codes
export function generateCodeString(prefix = 'NEST'): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0, O, 1, I
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${part1}-${part2}`;
}

// In-memory rate limiter
interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number;
}
const rateLimits = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry) {
    return { allowed: true };
  }

  if (entry.lockedUntil > now) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  // Reset if window expired (5 minutes)
  if (now - entry.firstAttempt > 5 * 60 * 1000) {
    rateLimits.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string): { locked: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimits.get(key) || { attempts: 0, firstAttempt: now, lockedUntil: 0 };

  entry.attempts += 1;

  // If >= 5 failed attempts, lock out
  if (entry.attempts >= 5) {
    const lockSeconds = Math.min(60 * Math.pow(2, entry.attempts - 5), 15 * 60); // 60s, 120s, up to 15m
    entry.lockedUntil = now + lockSeconds * 1000;
    rateLimits.set(key, entry);
    return { locked: true, retryAfterSeconds: lockSeconds };
  }

  rateLimits.set(key, entry);
  return { locked: false };
}

export function resetRateLimit(key: string): void {
  rateLimits.delete(key);
}

// Auth Database Manager
export class AuthStore {
  private db: AuthDatabase;

  constructor() {
    this.ensureDataDir();
    this.db = this.loadOrCreate();
  }

  private ensureDataDir() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadOrCreate(): AuthDatabase {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse auth_db.json, reinitializing...', err);
      }
    }

    // Initial setup: initial admin access code is 12345
    const initialSalt = crypto.randomBytes(16).toString('hex');
    const initialHash = hashWithSalt('12345', initialSalt);

    const initialDb: AuthDatabase = {
      admin: {
        hash: initialHash,
        salt: initialSalt,
        needsChange: true,
        lastChanged: Date.now(),
      },
      secretCodes: [],
      sessions: [],
    };

    // Pre-populate 4 sample active codes for immediate testing & enrollment
    const initialCodes = [
      { code: 'NEST-7701-VIPX', note: 'VIP Access Pass #1' },
      { code: 'NEST-8822-PRO9', note: 'Pro Member Pass #2' },
      { code: 'NEST-4411-DEMO', note: 'Early Adopter Pass #3' },
      { code: 'NEST-9900-BETA', note: 'Beta Access Pass #4' },
    ];

    for (const item of initialCodes) {
      const salt = crypto.randomBytes(12).toString('hex');
      const codeHash = hashWithSalt(item.code.toUpperCase().replace(/\s+/g, ''), salt);
      initialDb.secretCodes.push({
        id: 'sc_' + crypto.randomBytes(8).toString('hex'),
        code: item.code,
        codeHash,
        salt,
        status: 'active',
        createdAt: Date.now(),
        usedAt: null,
        usedBy: null,
        note: item.note,
      });
    }

    this.save(initialDb);
    return initialDb;
  }

  private save(data = this.db) {
    try {
      this.ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save auth_db.json', err);
    }
  }

  // --- Admin Methods ---

  public verifyAdminCode(code: string): { valid: boolean; needsChange: boolean } {
    const inputHash = hashWithSalt(code.trim(), this.db.admin.salt);
    const valid = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(this.db.admin.hash));
    return {
      valid,
      needsChange: this.db.admin.needsChange,
    };
  }

  public changeAdminCode(currentCode: string, newCode: string): { success: boolean; error?: string } {
    const { valid } = this.verifyAdminCode(currentCode);
    if (!valid) {
      return { success: false, error: 'Current admin access code is incorrect.' };
    }

    if (!newCode || newCode.trim().length < 5) {
      return { success: false, error: 'New admin code must be at least 5 characters long.' };
    }

    if (newCode.trim() === '12345') {
      return { success: false, error: 'Please choose a custom secure code instead of the default 12345.' };
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = hashWithSalt(newCode.trim(), newSalt);

    this.db.admin.hash = newHash;
    this.db.admin.salt = newSalt;
    this.db.admin.needsChange = false;
    this.db.admin.lastChanged = Date.now();

    this.save();
    return { success: true };
  }

  public createAdminSession(): string {
    const token = 'adm_' + crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    this.db.sessions.push({
      token,
      type: 'admin',
      createdAt: now,
      expiresAt,
    });

    this.cleanExpiredSessions();
    this.save();
    return token;
  }

  public validateAdminSession(token: string): boolean {
    if (!token) return false;
    const now = Date.now();
    const session = this.db.sessions.find(s => s.token === token && s.type === 'admin' && s.expiresAt > now);
    return !!session;
  }

  public invalidateSession(token: string): void {
    this.db.sessions = this.db.sessions.filter(s => s.token !== token);
    this.save();
  }

  // --- Secret Codes Methods ---

  public getAllCodes(): SecretCodeRecord[] {
    return [...this.db.secretCodes].sort((a, b) => b.createdAt - a.createdAt);
  }

  public generateSecretCodes(count = 1, note = 'Generated by Admin', prefix = 'NEST'): SecretCodeRecord[] {
    const safeCount = Math.max(1, Math.min(count, 50));
    const created: SecretCodeRecord[] = [];

    for (let i = 0; i < safeCount; i++) {
      let code = generateCodeString(prefix);
      // Ensure uniqueness
      while (this.db.secretCodes.some(c => c.code === code)) {
        code = generateCodeString(prefix);
      }

      const salt = crypto.randomBytes(12).toString('hex');
      const normalized = code.toUpperCase().replace(/\s+/g, '');
      const codeHash = hashWithSalt(normalized, salt);

      const record: SecretCodeRecord = {
        id: 'sc_' + crypto.randomBytes(8).toString('hex'),
        code,
        codeHash,
        salt,
        status: 'active',
        createdAt: Date.now(),
        usedAt: null,
        usedBy: null,
        note: note.trim() || 'Access Code',
      };

      this.db.secretCodes.push(record);
      created.push(record);
    }

    this.save();
    return created;
  }

  public updateCodeStatus(id: string, status: 'active' | 'disabled' | 'revoked', note?: string): SecretCodeRecord | null {
    const code = this.db.secretCodes.find(c => c.id === id);
    if (!code) return null;

    code.status = status;
    if (note !== undefined) {
      code.note = note.trim();
    }

    this.save();
    return code;
  }

  public deleteCode(id: string): boolean {
    const initialLen = this.db.secretCodes.length;
    this.db.secretCodes = this.db.secretCodes.filter(c => c.id !== id);
    const deleted = this.db.secretCodes.length < initialLen;
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  // --- User Enrollment Methods ---

  public verifyAndEnrollCode(
    rawCode: string,
    userName = 'Enrolled Member'
  ): {
    success: boolean;
    token?: string;
    error?: string;
    codeRecord?: SecretCodeRecord;
  } {
    const normalized = rawCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!normalized) {
      return { success: false, error: 'Please enter a secret access code.' };
    }

    // Find matching code by comparing hash
    const match = this.db.secretCodes.find(c => {
      const testHash = hashWithSalt(normalized, c.salt);
      return testHash === c.codeHash || c.code.toUpperCase().replace(/\s+/g, '') === normalized;
    });

    if (!match) {
      return { success: false, error: 'Invalid secret access code. Please check your code or contact the administrator.' };
    }

    if (match.status === 'disabled') {
      return { success: false, error: 'This access code is currently disabled by the administrator.' };
    }

    if (match.status === 'revoked') {
      return { success: false, error: 'This access code has been permanently revoked by the administrator.' };
    }

    if (match.status === 'used') {
      return { success: false, error: 'This access code has already been redeemed and cannot be reused.' };
    }

    // Mark as used
    match.status = 'used';
    match.usedAt = Date.now();
    match.usedBy = userName.trim() || 'Enrolled Member';

    // Issue user session token (7 days)
    const token = 'usr_' + crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;

    this.db.sessions.push({
      token,
      type: 'user',
      createdAt: now,
      expiresAt,
      codeId: match.id,
      userLabel: match.usedBy,
    });

    this.cleanExpiredSessions();
    this.save();

    return {
      success: true,
      token,
      codeRecord: match,
    };
  }

  public validateUserSession(token: string): { valid: boolean; user?: { name: string; codeId?: string } } {
    if (!token) return { valid: false };
    const now = Date.now();
    const session = this.db.sessions.find(s => s.token === token && s.type === 'user' && s.expiresAt > now);
    if (!session) return { valid: false };

    return {
      valid: true,
      user: {
        name: session.userLabel || 'Enrolled Member',
        codeId: session.codeId,
      },
    };
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    this.db.sessions = this.db.sessions.filter(s => s.expiresAt > now);
  }
}

export const authStore = new AuthStore();
