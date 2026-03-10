import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { RagService } from './services/rag.service';

@Module({
  imports: [ConfigModule],
  controllers: [AiAgentController],
  providers: [AiAgentService, RagService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
