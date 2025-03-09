import { Type } from "class-transformer"
import {
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from "class-validator"

export class CreateCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCheckoutProductDto)
  products: CreateCheckoutProductDto[]
}

export class CreateCheckoutProductDto {
  @IsString()
  externalRef: string

  @IsNumber()
  @Min(1)
  quantity: number
}
