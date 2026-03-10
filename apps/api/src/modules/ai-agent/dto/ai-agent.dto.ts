import { IsString, IsOptional, IsArray } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  context?: string; // Additional context like "inventory", "production"
}

export class UploadDocumentDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class AnalyticsQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  timeRange?: string; // "week", "month", "year"
}

export class TextToSQLDto {
  @IsString()
  naturalLanguageQuery: string;
}
