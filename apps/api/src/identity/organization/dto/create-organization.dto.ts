import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Plan } from '@prisma/client';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
    maxLength: 200,
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated if not provided)',
    example: 'acme-corporation',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description: 'Subscription plan',
    enum: Plan,
    default: Plan.PROFESSIONAL,
  })
  @IsOptional()
  @IsEnum(Plan)
  plan?: Plan;

  @ApiPropertyOptional({
    description: 'Organization-specific settings',
    example: { theme: 'light', notifications: true },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
