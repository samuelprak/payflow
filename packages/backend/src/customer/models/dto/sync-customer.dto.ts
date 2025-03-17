import { IsEmail, IsString } from "class-validator"

export class SyncCustomerDto {
  /**
   * The email of the customer.
   */
  @IsEmail()
  @IsString()
  email: string

  /**
   * The user reference of the customer.
   */
  @IsString()
  userRef: string
}
