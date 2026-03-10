import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiAgentService } from './ai-agent.service';
import {
  ChatQueryDto,
  UploadDocumentDto,
  AnalyticsQueryDto,
  TextToSQLDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('ai')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  /**
   * General chat endpoint with RAG
   */
  @Post('chat')
  async chat(@Body() dto: ChatQueryDto) {
    const response = await this.aiAgentService.chat(dto.question, dto.context);
    return { response };
  }

  /**
   * Inventory analysis
   */
  @Post('analyze/inventory')
  async analyzeInventory(@Body() dto: AnalyticsQueryDto) {
    const response = await this.aiAgentService.analyzeInventory(dto.query);
    return { response };
  }

  /**
   * Production planning analysis
   */
  @Post('analyze/production')
  async analyzeProduction(@Body() dto: AnalyticsQueryDto) {
    const response = await this.aiAgentService.analyzeProduction(dto.query);
    return { response };
  }

  /**
   * Text-to-SQL query (read-only)
   */
  @Post('query')
  @Roles('ADMIN', 'ANALYST')
  async textToSQL(@Body() dto: TextToSQLDto) {
    return this.aiAgentService.textToSQL(dto.naturalLanguageQuery);
  }

  // ==================== DOCUMENT MANAGEMENT ====================

  /**
   * Upload document for RAG
   */
  @Post('documents')
  @Roles('ADMIN')
  async uploadDocument(@Body() dto: UploadDocumentDto) {
    return this.aiAgentService.ingestDocument(
      dto.title,
      dto.content,
      dto.metadata,
    );
  }

  /**
   * Get all documents
   */
  @Get('documents')
  async getAllDocuments() {
    return this.aiAgentService.getAllDocuments();
  }

  /**
   * Delete document
   */
  @Delete('documents/:id')
  @Roles('ADMIN')
  async deleteDocument(@Param('id') id: string) {
    return this.aiAgentService.deleteDocument(id);
  }
}
