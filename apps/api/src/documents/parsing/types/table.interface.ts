/**
 * Table Interface
 * Represents a table extracted from a document
 */

export interface Table {
  /** Unique identifier for this table */
  id: string;

  /** Table title or caption (if available) */
  title?: string;

  /** Page number where this table appears */
  pageNumber: number;

  /** Table headers (column names) */
  headers: string[];

  /** Table rows */
  rows: TableRow[];

  /** Table metadata */
  metadata?: TableMetadata;
}

export interface TableRow {
  /** Row index (0-based) */
  index: number;

  /** Cell values (aligned with headers) */
  cells: TableCell[];
}

export interface TableCell {
  /** Column index (0-based) */
  columnIndex: number;

  /** Cell value (text content) */
  value: string;

  /** Cell formatting */
  formatting?: CellFormatting;

  /** Cell type hint (for semantic understanding) */
  type?: 'text' | 'number' | 'date' | 'currency' | 'percentage';
}

export interface CellFormatting {
  /** Bold text */
  bold?: boolean;

  /** Italic text */
  italic?: boolean;

  /** Text alignment */
  align?: 'left' | 'center' | 'right';

  /** Background color */
  backgroundColor?: string;

  /** Merged cell span */
  colspan?: number;
  rowspan?: number;
}

export interface TableMetadata {
  /** Number of columns */
  columnCount: number;

  /** Number of rows (excluding header) */
  rowCount: number;

  /** Has header row */
  hasHeader: boolean;

  /** Table position in document */
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
