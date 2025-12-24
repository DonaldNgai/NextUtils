import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env files in workspace root
const workspaceRoot = resolve(__dirname, '../../..');
dotenv.config({ path: resolve(workspaceRoot, '.env') });
dotenv.config({ path: resolve(workspaceRoot, '.env') });

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  throw new Error('POSTGRES_URL or DATABASE_URL environment variable is not set');
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
