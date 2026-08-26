import * as PrismaClientModule from '@prisma/client';

const PrismaClient = (PrismaClientModule as unknown as {
  PrismaClient: new (options?: { log?: string[] }) => object;
}).PrismaClient;

const globalForPrisma = global as unknown as {
  prisma: InstanceType<typeof PrismaClient>;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;