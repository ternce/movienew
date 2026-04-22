import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<{
        isActive: boolean;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        referralCode: string;
        passwordHash: string;
        phone: string | null;
        firstName: string;
        lastName: string;
        dateOfBirth: Date;
        ageCategory: import(".prisma/client").$Enums.AgeCategory;
        avatarUrl: string | null;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
        verificationMethod: import(".prisma/client").$Enums.VerificationMethod | null;
        role: import(".prisma/client").$Enums.UserRole;
        referredById: string | null;
        bonusBalance: import("@prisma/client/runtime/library").Decimal;
        lastLoginAt: Date | null;
    }>;
}
export {};
//# sourceMappingURL=local.strategy.d.ts.map