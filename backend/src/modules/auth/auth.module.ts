import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ENV, type Env } from "../../config/env.js";
import { CustomersModule } from "../customers/customers.module.js";
import { NotificationsModule } from "../notifications/notifications.module.js";
import { UsersModule } from "../users/users.module.js";
import { AccessTokenGuard } from "./access-token.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { OtpService } from "./otp.service.js";
import { JWT_ISSUER, TokensService } from "./tokens.service.js";

@Module({
  imports: [
    UsersModule,
    CustomersModule,
    NotificationsModule,
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        // Audience is set per token (customer vs staff) in TokensService.
        signOptions: { algorithm: "HS256", issuer: JWT_ISSUER },
        verifyOptions: { algorithms: ["HS256"], issuer: JWT_ISSUER },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokensService, AccessTokenGuard],
  exports: [TokensService, AccessTokenGuard, OtpService],
})
export class AuthModule {}
