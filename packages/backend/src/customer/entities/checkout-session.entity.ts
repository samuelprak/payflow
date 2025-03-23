import { Customer } from "src/customer/entities/customer.entity"
import { CreateCheckoutSessionDto } from "src/customer/models/dto/create-checkout.dto"
import { Tenant } from "src/tenant/entities/tenant.entity"
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

export const DEFAULT_EXPIRATION_TIME = 1000 * 60 * 60 * 24 // 1 day

@Entity()
export class CheckoutSession {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(() => Customer)
  customer: Customer

  @ManyToOne(() => Tenant)
  tenant: Tenant

  @Column({ type: "jsonb" })
  configuration: CreateCheckoutSessionDto

  @Column()
  expiresAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
