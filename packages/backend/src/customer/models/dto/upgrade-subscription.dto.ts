import { Type } from "class-transformer"
import {
  IsArray,
  IsNumber,
  IsString,
  Min,
  ValidateNested,
} from "class-validator"

export class UpgradeSubscriptionDto {
  /**
   * The user reference of the customer.
   */
  @IsString()
  userRef: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpgradeSubscriptionProductDto)
  products: UpgradeSubscriptionProductDto[]
}

export class UpgradeSubscriptionProductDto {
  @IsString()
  externalRef: string

  @IsNumber()
  @Min(1)
  quantity: number
}
