import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsNotEmpty, IsString, IsEnum, IsUUID } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({
    description: 'User UUID to add to the organization',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description: 'Role to assign to the user',
    enum: UserRole,
    example: UserRole.MEMBER,
    default: UserRole.MEMBER,
  })
  @IsNotEmpty()
  @IsEnum(UserRole)
  role!: UserRole;
}
