import { Module, forwardRef } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [forwardRef(() => SettingsModule)],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}