import { Customer } from "src/customer/entities/customer.entity"
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
export class PortalSession {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(() => Customer)
  customer: Customer

  @ManyToOne(() => Tenant)
  tenant: Tenant

  @Column()
  returnUrl: string

  @Column()
  expiresAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
