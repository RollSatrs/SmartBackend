import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { IdeasModule } from 'src/ideas/ideas.module';

@Module({
  imports: [IdeasModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
