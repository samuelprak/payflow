import { BaseCustomer } from "src/payment-provider/interfaces/base-customer"
import { StripeCustomer } from "src/stripe/entities/stripe-customer.entity"
import { Tenant } from "src/tenant/entities/tenant.entity"
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
  OneToOne,
  RelationId,
} from "typeorm"

@Entity()
@Unique(["userRef", "tenant"])
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  email: string

  @Column()
  userRef: string

  @ManyToOne(() => Tenant, (tenant) => tenant.customers)
  tenant: Tenant

  @RelationId((customer: Customer) => customer.tenant)
  tenantId: string

  @OneToOne(() => StripeCustomer, (stripeCustomer) => stripeCustomer.customer)
  stripeCustomer: StripeCustomer

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  toBaseCustomer(): BaseCustomer {
    return {
      id: this.id,
      email: this.email,
      userRef: this.userRef,
      tenantId: this.tenantId,
    }
  }
}
