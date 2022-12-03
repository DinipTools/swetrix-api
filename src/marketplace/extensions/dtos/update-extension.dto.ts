import { ApiProperty } from '@nestjs/swagger'
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator'

export class UpdateExtension {
  @ApiProperty({
    description: 'Extension name',
    example: '', // TODO: Add example
    maxLength: 255,
    minLength: 1,
    type: String,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  readonly name!: string

  @ApiProperty({
    default: null,
    description: 'Extension description',
    example: '', // Add example
    maxLength: 1024,
    minLength: 1,
    nullable: true,
    required: false,
    type: String,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(1024)
  readonly description?: string | null

  @ApiProperty({
    description: 'Extension version',
    example: '1.0.0',
    maxLength: 255,
    minLength: 5,
    type: String,
  })
  @IsString()
  @IsOptional()
  @Matches(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)
  @MaxLength(255)
  readonly version!: string

  @ApiProperty({
    default: 0,
    description: 'Extension price',
    example: 100,
    required: false,
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  readonly price?: number

  @IsNumber()
  @IsOptional()
  readonly installs?: number

  @ApiProperty({
    default: [],
    description: 'Extension category ID',
    example: 1,
    required: false,
    type: Array<number>,
  })
  @IsOptional()
  readonly categoryID?: number
}
