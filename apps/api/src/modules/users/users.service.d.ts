import { PrismaService } from '../../config/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findById(id: string): Promise<{
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
    } | null>;
    findByEmail(email: string): Promise<{
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
    } | null>;
    findByReferralCode(code: string): Promise<{
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
    } | null>;
}
//# sourceMappingURL=users.service.d.ts.map