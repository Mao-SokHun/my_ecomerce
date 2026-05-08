import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const parseHealthTimeoutMs = (): number => {
  const raw = process.env.DB_HEALTH_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!raw || Number.isNaN(parsed) || parsed <= 0) return 5000;
  return parsed;
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`DB health check timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, parseHealthTimeoutMs());
    return true;
  } catch {
    return false;
  }
};

export default prisma;
