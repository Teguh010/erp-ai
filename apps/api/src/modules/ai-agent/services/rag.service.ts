import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private embeddings: OpenAIEmbeddings;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: 'text-embedding-3-small',
      });
    }
  }

  /**
   * Split text into chunks for embedding
   */
  private splitTextIntoChunks(
    text: string,
    chunkSize = 500,
    overlap = 50,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - overlap;
    }

    return chunks;
  }

  /**
   * Ingest a document - split into chunks and store embeddings
   */
  async ingestDocument(
    title: string,
    content: string,
    metadata?: Record<string, any>,
  ) {
    this.logger.log(`Ingesting document: ${title}`);

    // Create the document record
    const document = await this.prisma.aIDocument.create({
      data: {
        title,
        content,
        metadata: metadata || {},
      },
    });

    // Split content into chunks
    const chunks = this.splitTextIntoChunks(content);
    this.logger.log(`Split into ${chunks.length} chunks`);

    // Generate embeddings and store chunks
    for (let i = 0; i < chunks.length; i++) {
      let embedding: number[] | null = null;

      if (this.embeddings) {
        try {
          const embedResult = await this.embeddings.embedQuery(chunks[i]);
          embedding = embedResult;
        } catch (error) {
          this.logger.warn(
            `Failed to generate embedding for chunk ${i}: ${error.message}`,
          );
        }
      }

      await this.prisma.aIDocumentChunk.create({
        data: {
          documentId: document.id,
          content: chunks[i],
          embedding: embedding ?? undefined,
          chunkIndex: i,
        },
      });
    }

    return {
      documentId: document.id,
      title,
      chunksCreated: chunks.length,
    };
  }

  /**
   * Search for relevant chunks using cosine similarity
   */
  async searchSimilarChunks(query: string, topK = 3): Promise<string[]> {
    if (!this.embeddings) {
      // Fallback: simple keyword search if no embeddings
      return this.fallbackSearch(query, topK);
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);

      // Get all chunks - filter those with embeddings manually
      const allChunks = await this.prisma.aIDocumentChunk.findMany({
        include: {
          document: { select: { title: true } },
        },
      });

      // Filter chunks that have embeddings
      const chunksWithEmbeddings = allChunks.filter(
        (chunk) => chunk.embedding !== null && Array.isArray(chunk.embedding),
      );

      // Calculate cosine similarity
      const scored = chunksWithEmbeddings.map((chunk) => {
        const embedding = chunk.embedding as number[];
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        return { chunk, similarity };
      });

      // Sort by similarity and return top K
      scored.sort((a, b) => b.similarity - a.similarity);

      return scored
        .slice(0, topK)
        .map((s) => `[${s.chunk.document.title}]: ${s.chunk.content}`);
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      return this.fallbackSearch(query, topK);
    }
  }

  /**
   * Fallback keyword-based search
   */
  private async fallbackSearch(query: string, topK: number): Promise<string[]> {
    const keywords = query
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 2);

    const chunks = await this.prisma.aIDocumentChunk.findMany({
      include: {
        document: { select: { title: true } },
      },
      take: 100,
    });

    // Score by keyword matches
    const scored = chunks.map((chunk) => {
      const lowerContent = chunk.content.toLowerCase();
      const score = keywords.reduce(
        (acc, kw) => acc + (lowerContent.includes(kw) ? 1 : 0),
        0,
      );
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored
      .slice(0, topK)
      .filter((s) => s.score > 0)
      .map((s) => `[${s.chunk.document.title}]: ${s.chunk.content}`);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Get all documents
   */
  async getAllDocuments() {
    return this.prisma.aIDocument.findMany({
      include: {
        _count: { select: { chunks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Delete a document and its chunks
   */
  async deleteDocument(id: string) {
    return this.prisma.aIDocument.delete({ where: { id } });
  }
}
