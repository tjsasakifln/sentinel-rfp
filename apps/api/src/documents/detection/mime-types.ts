/**
 * Supported document MIME types
 * Maps MIME types to file extensions and parser types
 */

/**
 * Parser types enum
 */
export enum ParserType {
  PDF_PARSER = 'PDF_PARSER',
  DOCX_PARSER = 'DOCX_PARSER',
  XLSX_PARSER = 'XLSX_PARSER',
  PPTX_PARSER = 'PPTX_PARSER',
}

/**
 * Document type configuration
 */
export interface DocumentTypeConfig {
  mimeType: string;
  extensions: string[];
  parserType: ParserType;
}

/**
 * Supported document types with MIME type and extension mapping
 */
export const SUPPORTED_MIME_TYPES: Record<string, DocumentTypeConfig> = {
  PDF: {
    mimeType: 'application/pdf',
    extensions: ['.pdf'],
    parserType: ParserType.PDF_PARSER,
  },
  DOCX: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['.docx'],
    parserType: ParserType.DOCX_PARSER,
  },
  XLSX: {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extensions: ['.xlsx'],
    parserType: ParserType.XLSX_PARSER,
  },
  PPTX: {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extensions: ['.pptx'],
    parserType: ParserType.PPTX_PARSER,
  },
};

/**
 * Get all supported MIME types as array
 */
export const getAllSupportedMimeTypes = (): string[] => {
  return Object.values(SUPPORTED_MIME_TYPES).map((type) => type.mimeType);
};

/**
 * Get all supported extensions as array
 */
export const getAllSupportedExtensions = (): string[] => {
  return Object.values(SUPPORTED_MIME_TYPES).flatMap((type) => type.extensions);
};

/**
 * Map MIME type to parser type
 */
export const getParserTypeFromMimeType = (mimeType: string): ParserType | null => {
  const entry = Object.values(SUPPORTED_MIME_TYPES).find((type) => type.mimeType === mimeType);
  return entry ? entry.parserType : null;
};

/**
 * Map extension to parser type
 */
export const getParserTypeFromExtension = (extension: string): ParserType | null => {
  const normalizedExt = extension.toLowerCase();
  const entry = Object.values(SUPPORTED_MIME_TYPES).find((type) =>
    type.extensions.includes(normalizedExt),
  );
  return entry ? entry.parserType : null;
};
