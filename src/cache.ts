import { Database } from "bun:sqlite";

export class CacheManager {
  private db: Database;

  constructor(dbPath: string = "database.sqlite") {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        expiresAt INTEGER NOT NULL
      );
    `);
  }

  async get<T>(key: string, maxAgeMs: number): Promise<T | null> {
    const stmt = this.db.prepare('SELECT data, timestamp FROM cache WHERE key = ?');
    const result = stmt.get(key) as { data: string; timestamp: number } | undefined;

    if (!result) {
      return null;
    }

    const age = Date.now() - result.timestamp;
    if (age > maxAgeMs) {
      this.delete(key);
      return null;
    }

    try {
      return JSON.parse(result.data);
    } catch {
      this.delete(key);
      return null;
    }
  }

  async set<T>(key: string, data: T): Promise<void> {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO cache (key, data, timestamp) VALUES (?, ?, ?)');
    stmt.run(key, JSON.stringify(data), Date.now());
  }

  delete(key: string): void {
    const stmt = this.db.prepare('DELETE FROM cache WHERE key = ?');
    stmt.run(key);
  }

  clearAll(): void {
    const stmt = this.db.prepare('DELETE FROM cache');
    stmt.run();
  }


  // Session management methods
  createSession(sessionId: string, userId: number, expiresAt: number): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO sessions (sessionId, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)');
    stmt.run(sessionId, userId, Date.now(), expiresAt);
  }

  getSession(sessionId: string): { userId: number; expiresAt: number } | null {
    const stmt = this.db.prepare('SELECT userId, expiresAt FROM sessions WHERE sessionId = ?');
    const result = stmt.get(sessionId) as { userId: number; expiresAt: number } | undefined;

    if (!result) {
      return null;
    }

    // Check if session is expired
    if (Date.now() > result.expiresAt) {
      this.deleteSession(sessionId);
      return null;
    }

    return result;
  }

  deleteSession(sessionId: string): void {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE sessionId = ?');
    stmt.run(sessionId);
  }

  close(): void {
    this.db.close();
  }
}

// Global cache instance
let globalCacheManager: CacheManager | null = null;

function getCacheManager(): CacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new CacheManager();
  }
  return globalCacheManager;
}

// Standalone function to clear all cache
export async function clearCache(): Promise<void> {
  const cacheManager = getCacheManager();
  cacheManager.clearAll();
}

