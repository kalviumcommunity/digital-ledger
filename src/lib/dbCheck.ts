import net from 'net';

let cachedDbStatus: boolean | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 10000; // 10 seconds cache

/**
 * Parses DATABASE_URL and performs a silent TCP probe
 * to prevent Prisma engine from dumping connection errors when database is offline.
 */
export async function isDatabaseReachable(): Promise<boolean> {
  const now = Date.now();
  if (cachedDbStatus !== null && now - lastCheckTime < CACHE_TTL_MS) {
    return cachedDbStatus;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    cachedDbStatus = false;
    lastCheckTime = now;
    return false;
  }

  try {
    // Normalise URL scheme to parse host and port
    const normalized = dbUrl.replace(/^postgresql:\/\//i, 'http://').replace(/^postgres:\/\//i, 'http://');
    const parsed = new URL(normalized);
    const host = parsed.hostname || 'localhost';
    const port = parsed.port ? parseInt(parsed.port, 10) : 5432;

    const reachable = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(250);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      try {
        socket.connect(port, host);
      } catch {
        resolve(false);
      }
    });

    cachedDbStatus = reachable;
    lastCheckTime = now;
    return reachable;
  } catch {
    cachedDbStatus = false;
    lastCheckTime = now;
    return false;
  }
}

export function markDatabaseOffline(): void {
  cachedDbStatus = false;
  lastCheckTime = Date.now();
}
