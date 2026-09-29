import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ClassificationService } from './classification.service';
import { GeocodingService } from './geocoding.service';
import { IdeasController } from './ideas.controller';
import { IdeasService } from './ideas.service';

@Module({
  imports: [AuthModule],
  controllers: [IdeasController],
  providers: [IdeasService, GeocodingService, ClassificationService],
  exports: [ClassificationService],
})
export class IdeasModule {}
