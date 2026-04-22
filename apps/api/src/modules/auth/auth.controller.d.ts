import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(user: any): Promise<import("./auth.service").TokenResponse>;
    refresh(refreshToken: string): Promise<import("./auth.service").TokenResponse>;
}
//# sourceMappingURL=auth.controller.d.ts.map