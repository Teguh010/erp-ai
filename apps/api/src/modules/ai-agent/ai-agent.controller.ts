import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI assistant using RAG' })
  async chat(@Body() dto: ChatQueryDto) {
    const response = await this.aiAgentService.chat(dto.question, dto.context);
    return { response };
  }

  @Post('analyze/inventory')
  @ApiOperation({ summary: 'AI-powered inventory analysis' })
  async analyzeInventory(@Body() dto: AnalyticsQueryDto) {
    const response = await this.aiAgentService.analyzeInventory(dto.query);
    return { response };
  }

  @Post('analyze/production')
  @ApiOperation({ summary: 'AI-powered production planning analysis' })
  async analyzeProduction(@Body() dto: AnalyticsQueryDto) {
    const response = await this.aiAgentService.analyzeProduction(dto.query);
    return { response };
  }

  @Post('query')
  @ApiOperation({ summary: 'Natural language to SQL query' })
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
