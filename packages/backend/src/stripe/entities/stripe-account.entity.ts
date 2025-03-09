import { Tenant } from "src/tenant/entities/tenant.entity"
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"

@Entity()
export class StripeAccount {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  stripePublishableKey: string

  @Column()
  stripeSecretKey: string

  @ManyToMany(() => Tenant, (tenant) => tenant.stripeAccounts)
  @JoinTable()
  tenants: Tenant[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
