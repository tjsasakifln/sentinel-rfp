import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for single file upload metadata
 * Used in conjunction with multipart form data files
 */
export class UploadDocumentDto {
  @ApiProperty({
    description: 'Optional custom name for the document',
    example: 'RFP-2024-Q1-Federal-Agency',
    required: false,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Optional description or notes about the document',
    example: 'Federal RFP for IT modernization services',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/**
 * DTO for batch upload metadata
 * Used when uploading multiple files
 */
export class BatchUploadDto {
  @ApiProperty({
    description: 'Optional prefix to apply to all uploaded documents',
    example: 'Q1-2024',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchPrefix?: string;
}
