import { ContentBlock } from './content-block.interface';
import { HeadingNode } from './heading-node.interface';
import { Table } from './table.interface';

/**
 * Parsed Document Interface
 * Main output structure from document parsing
 */
export interface ParsedDocument {
  /** Unique identifier for this parsed document */
  id: string;

  /** Array of parsed pages */
  pages: ParsedPage[];

  /** Document-level metadata */
  metadata: DocumentMetadata;

  /** Hierarchical structure of headings */
  hierarchy: HeadingNode[];
}

export interface ParsedPage {
  /** Page number (1-based) */
  pageNumber: number;

  /** Content blocks on this page */
  content: ContentBlock[];

  /** Tables on this page */
  tables: Table[];

  /** Page-level metadata */
  metadata?: PageMetadata;
}

export interface DocumentMetadata {
  /** Document title (extracted or inferred) */
  title?: string;

  /** Document author */
  author?: string;

  /** Creation date */
  createdAt?: Date;

  /** Last modified date */
  modifiedAt?: Date;

  /** Document format (pdf, docx, etc.) */
  format: DocumentFormat;

  /** Total page count */
  pageCount: number;

  /** Total word count (approximate) */
  wordCount?: number;

  /** Document language(s) */
  languages?: string[];

  /** Custom metadata from source document */
  custom?: Record<string, unknown>;
}

export interface PageMetadata {
  /** Page width (in points) */
  width?: number;

  /** Page height (in points) */
  height?: number;

  /** Page orientation */
  orientation?: 'portrait' | 'landscape';

  /** Page rotation (degrees) */
  rotation?: number;

  /** Has images on this page */
  hasImages?: boolean;

  /** Has tables on this page */
  hasTables?: boolean;
}

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'image' | 'unknown';

/**
 * Document type enum for parser selection
 */
export enum DocumentType {
  PDF = 'pdf',
  DOCX = 'docx',
  XLSX = 'xlsx',
  IMAGE = 'image',
  UNKNOWN = 'unknown',
}
