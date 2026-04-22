import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private usersService;
    constructor(configService: ConfigService, usersService: UsersService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        ageCategory: import(".prisma/client").$Enums.AgeCategory;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
    }>;
}
export {};
//# sourceMappingURL=jwt.strategy.d.ts.map