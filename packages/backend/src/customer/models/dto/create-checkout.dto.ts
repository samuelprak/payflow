import { Type } from "class-transformer"
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator"

export class CreateCheckoutSessionDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCheckoutProductDto)
  products: CreateCheckoutProductDto[]

  @IsString()
  @IsOptional()
  successUrl?: string

  @IsString()
  @IsOptional()
  cancelUrl?: string
}

export class CreateCheckoutProductDto {
  @IsString()
  externalRef: string

  @IsNumber()
  @Min(1)
  quantity: number
}
