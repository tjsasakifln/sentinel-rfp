/**
 * Content Block Interface
 * Represents a single block of content extracted from a document
 */

export type ContentBlockType = 'text' | 'heading' | 'list' | 'table' | 'image' | 'code' | 'quote';

export interface ContentBlock {
  /** Unique identifier for this content block */
  id: string;

  /** Type of content block */
  type: ContentBlockType;

  /** Text content of the block */
  content: string;

  /** Metadata specific to the content type */
  metadata?: ContentBlockMetadata;

  /** Formatting information */
  formatting?: ContentFormatting;
}

export interface ContentBlockMetadata {
  /** For headings: level (1-6) */
  headingLevel?: number;

  /** For lists: ordered vs unordered */
  listType?: 'ordered' | 'unordered';

  /** For images: URL or base64 */
  imageUrl?: string;

  /** For code blocks: programming language */
  language?: string;

  /** For tables: reference to table data */
  tableId?: string;

  /** Original element type from source parser */
  sourceType?: string;
}

export interface ContentFormatting {
  /** Bold text */
  bold?: boolean;

  /** Italic text */
  italic?: boolean;

  /** Underline */
  underline?: boolean;

  /** Font size (relative or absolute) */
  fontSize?: number;

  /** Text color (hex or named) */
  color?: string;
}
