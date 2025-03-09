import { Customer } from "src/customer/entities/customer.entity"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from "typeorm"

@Entity()
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column()
  apiKey: string

  @OneToMany(() => Customer, (customer) => customer.tenant)
  customers: Customer[]

  @Column()
  webhookUrl: string

  @ManyToMany(() => StripeAccount, (stripeAccount) => stripeAccount.tenants)
  stripeAccounts: StripeAccount[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
