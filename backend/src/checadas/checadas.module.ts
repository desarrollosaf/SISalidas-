import { Module } from '@nestjs/common';
import { CompartidoModule } from '../common/compartido.module';
import { ChecadasService } from './checadas.service';

@Module({
  imports: [CompartidoModule],
  providers: [ChecadasService],
})
export class ChecadasModule {}
