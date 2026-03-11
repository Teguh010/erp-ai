import { PrismaClient } from '@prisma/client';

/**
 * Type for Prisma interactive transaction client
 * Use this when passing transaction context across services
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
