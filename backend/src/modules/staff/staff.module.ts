import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { StaffAuthController } from "./staff-auth.controller.js";
import { StaffAuthService } from "./staff-auth.service.js";
import { StaffController } from "./staff.controller.js";
import { StaffGuard } from "./staff.guard.js";
import { StaffService } from "./staff.service.js";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [StaffAuthController, StaffController],
  providers: [StaffAuthService, StaffService, StaffGuard],
  exports: [StaffGuard, AuthModule],
})
export class StaffModule {}
