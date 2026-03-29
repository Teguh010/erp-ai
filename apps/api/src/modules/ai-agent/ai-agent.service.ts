import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RagService } from './services/rag.service';
import Groq from 'groq-sdk';
import {
  SYSTEM_PROMPT,
  RAG_PROMPT_TEMPLATE,
  TEXT_TO_SQL_PROMPT,
  INVENTORY_ANALYSIS_PROMPT,
  PRODUCTION_PLANNING_PROMPT,
} from './templates/prompts';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private groq: Groq | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ragService: RagService,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.groq = new Groq({ apiKey });
      this.logger.log('Groq AI service initialized');
    } else {
      this.logger.warn('GROQ_API_KEY not set - AI features will be limited');
    }
  }

  /**
   * General chat with RAG context
   */
  async chat(question: string, contextType?: string) {
    // Get relevant documentation context
    const ragContext = await this.ragService.searchSimilarChunks(question);

    // Get relevant database context based on question type
    const dbContext = await this.getRelevantDbContext(question, contextType);

    const prompt = RAG_PROMPT_TEMPLATE.replace(
      '{context}',
      ragContext.join('\n\n'),
    )
      .replace('{dbContext}', dbContext)
      .replace('{question}', question);

    return this.generateResponse(prompt);
  }

  /**
   * Analyze inventory and provide insights
   */
  async analyzeInventory(query: string) {
    // Fetch current inventory data
    const [stocks, movements, lowStockItems] = await Promise.all([
      this.prisma.stock.findMany({
        include: {
          product: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
        take: 50,
      }),
      this.prisma.stockMovement.findMany({
        include: {
          product: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.stock.findMany({
        where: {
          quantity: { lte: 0 },
        },
        include: {
          product: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
      }),
    ]);

    const prompt = INVENTORY_ANALYSIS_PROMPT.replace(
      '{inventoryData}',
      JSON.stringify(stocks, null, 2),
    )
      .replace('{movements}', JSON.stringify(movements, null, 2))
      .replace('{lowStockItems}', JSON.stringify(lowStockItems, null, 2))
      .replace('{query}', query);

    return this.generateResponse(prompt);
  }

  /**
   * Production planning assistance
   */
  async analyzeProduction(query: string) {
    const [productionOrders, boms, stocks] = await Promise.all([
      this.prisma.productionOrder.findMany({
        include: {
          bom: {
            include: { product: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.billOfMaterials.findMany({
        include: {
          product: { select: { name: true } },
          items: true,
        },
      }),
      this.prisma.stock.findMany({
        include: {
          product: { select: { name: true } },
          warehouse: { select: { name: true } },
        },
      }),
    ]);

    const prompt = PRODUCTION_PLANNING_PROMPT.replace(
      '{productionOrders}',
      JSON.stringify(productionOrders, null, 2),
    )
      .replace('{bomData}', JSON.stringify(boms, null, 2))
      .replace('{stockLevels}', JSON.stringify(stocks, null, 2))
      .replace('{query}', query);

    return this.generateResponse(prompt);
  }

  /**
   * Convert natural language to SQL (read-only)
   */
  async textToSQL(naturalLanguageQuery: string) {
    const prompt = TEXT_TO_SQL_PROMPT.replace('{query}', naturalLanguageQuery);

    const sqlQuery = await this.generateResponse(prompt, true);

    if (!sqlQuery) {
      return { error: 'Failed to generate SQL query' };
    }

    // Security: Only allow SELECT queries
    const cleanedQuery = sqlQuery.trim();
    if (!cleanedQuery.toUpperCase().startsWith('SELECT')) {
      return { error: 'Only SELECT queries are allowed' };
    }

    try {
      // Execute the query safely
      const results = await this.prisma.$queryRawUnsafe(cleanedQuery);
      return {
        query: cleanedQuery,
        results,
      };
    } catch (error) {
      this.logger.error(`SQL execution error: ${error.message}`);
      return {
        query: cleanedQuery,
        error: `Query execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Get relevant database context based on question
   */
  private async getRelevantDbContext(
    question: string,
    contextType?: string,
  ): Promise<string> {
    const lowerQuestion = question.toLowerCase();
    const contexts: string[] = [];

    // Determine what data to fetch based on question content
    if (
      contextType === 'inventory' ||
      lowerQuestion.includes('stock') ||
      lowerQuestion.includes('inventory') ||
      lowerQuestion.includes('warehouse')
    ) {
      const stats = await this.prisma.stock.aggregate({
        _sum: { quantity: true },
        _count: true,
      });
      contexts.push(
        `Inventory summary: ${stats._count} stock records, total quantity: ${stats._sum.quantity}`,
      );
    }

    if (
      contextType === 'production' ||
      lowerQuestion.includes('production') ||
      lowerQuestion.includes('bom') ||
      lowerQuestion.includes('manufacture')
    ) {
      const orders = await this.prisma.productionOrder.groupBy({
        by: ['status'],
        _count: true,
      });
      contexts.push(`Production orders by status: ${JSON.stringify(orders)}`);
    }

    if (
      lowerQuestion.includes('supplier') ||
      lowerQuestion.includes('purchase') ||
      lowerQuestion.includes('procurement')
    ) {
      const suppliers = await this.prisma.supplier.count();
      const poCount = await this.prisma.purchaseOrder.count();
      contexts.push(`Suppliers: ${suppliers}, Purchase orders: ${poCount}`);
    }

    return contexts.join('\n') || 'No specific database context available.';
  }

  /**
   * Generate response using Groq
   */
  private async generateResponse(
    prompt: string,
    rawOutput = false,
  ): Promise<string> {
    if (!this.groq) {
      return 'AI service is not configured. Please set GROQ_API_KEY in environment variables.';
    }

    try {
      const response = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: rawOutput ? 0 : 0.7,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content || 'No response generated.';
    } catch (error) {
      this.logger.error(`Groq API error: ${error.message}`);
      return `AI service error: ${error.message}`;
    }
  }

  /**
   * Ingest document for RAG
   */
  async ingestDocument(
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ) {
    return this.ragService.ingestDocument(title, content, metadata);
  }

  /**
   * Get all documents
   */
  async getAllDocuments() {
    return this.ragService.getAllDocuments();
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string) {
    return this.ragService.deleteDocument(id);
  }
}
