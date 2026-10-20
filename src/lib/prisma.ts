import { PrismaClient } from "@prisma/client";
import { Pool, PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// Cache both PrismaClient and pg.Pool on globalThis to prevent connection leaks,
// avoid cold-start TLS latency with Neon, and respect connection limits.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pool = globalForPrisma.pgPool ?? new Pool(poolConfig);
globalForPrisma.pgPool = pool;

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
