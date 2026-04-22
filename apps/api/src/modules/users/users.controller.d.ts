import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(userId: string): Promise<{
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
    updateProfile(userId: string, updateData: any): Promise<{
        userId: string;
        updateData: any;
    }>;
}
//# sourceMappingURL=users.controller.d.ts.map