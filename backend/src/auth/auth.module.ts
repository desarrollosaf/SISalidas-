import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { RolesModule } from '../roles/roles.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [CompartidoModule, RolesModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
