import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    executeInTransaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T>;
    cleanDatabase(): Promise<void>;
}
//# sourceMappingURL=prisma.service.d.ts.map