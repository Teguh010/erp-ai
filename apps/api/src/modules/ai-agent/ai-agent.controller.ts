import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
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
import { ThrottleAI, ThrottleRelaxed } from '../../common';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('chat')
  @ThrottleAI() // 10 requests per minute for AI operations
  @ApiOperation({ summary: 'Chat with AI assistant using RAG' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async chat(@Body() dto: ChatQueryDto) {
    const response = await this.aiAgentService.chat(dto.question, dto.context);
    return { response };
  }

  @Post('analyze/inventory')
  @ThrottleAI() // 10 requests per minute for AI operations
  @ApiOperation({ summary: 'AI-powered inventory analysis' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async analyzeInventory(@Body() dto: AnalyticsQueryDto) {
    const response = await this.aiAgentService.analyzeInventory(dto.query);
    return { response };
  }

  @Post('analyze/production')
  @ThrottleAI() // 10 requests per minute for AI operations
  @ApiOperation({ summary: 'AI-powered production planning analysis' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async analyzeProduction(@Body() dto: AnalyticsQueryDto) {
    const response = await this.aiAgentService.analyzeProduction(dto.query);
    return { response };
  }

  @Post('query')
  @ThrottleAI() // 10 requests per minute for AI operations
  @ApiOperation({ summary: 'Natural language to SQL query' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
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
  @ThrottleRelaxed() // More relaxed for read operations
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
