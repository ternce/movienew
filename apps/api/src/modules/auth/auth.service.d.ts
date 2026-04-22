import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    ageCategory: string;
    verificationStatus: string;
}
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare class AuthService {
    private usersService;
    private jwtService;
    private configService;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService);
    validateUser(email: string, password: string): Promise<{
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
    login(user: {
        id: string;
        email: string;
        role: string;
        ageCategory: string;
        verificationStatus: string;
    }): Promise<TokenResponse>;
    refreshToken(token: string): Promise<TokenResponse>;
    hashPassword(password: string): Promise<string>;
}
//# sourceMappingURL=auth.service.d.ts.map