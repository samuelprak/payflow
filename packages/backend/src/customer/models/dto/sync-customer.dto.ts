import { IsEmail, IsString } from "class-validator"

export class SyncCustomerDto {
  @IsEmail()
  @IsString()
  email: string

  @IsString()
  userRef: string
}
