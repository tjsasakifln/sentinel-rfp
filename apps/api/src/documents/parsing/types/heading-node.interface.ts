/**
 * Heading Node Interface
 * Represents a hierarchical structure of document headings
 */

export interface HeadingNode {
  /** Unique identifier for this heading */
  id: string;

  /** Heading text content */
  text: string;

  /** Heading level (1-6, where 1 is top-level) */
  level: number;

  /** Page number where this heading appears */
  pageNumber: number;

  /** Child headings nested under this heading */
  children: HeadingNode[];

  /** Parent heading ID (null for top-level headings) */
  parentId: string | null;

  /** Optional metadata */
  metadata?: HeadingMetadata;
}

export interface HeadingMetadata {
  /** Original formatting information */
  formatting?: {
    bold?: boolean;
    fontSize?: number;
    color?: string;
  };

  /** Reference to the content block ID */
  contentBlockId?: string;

  /** Custom tags or categories */
  tags?: string[];
}

/**
 * Utility type for flat heading representation
 */
export interface FlatHeading {
  id: string;
  text: string;
  level: number;
  pageNumber: number;
  parentId: string | null;
}
