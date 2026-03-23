import { Customer } from "src/customer/entities/customer.entity"
import { StripeAccount } from "src/stripe/entities/stripe-account.entity"
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  Relation,
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
  customers: Relation<Customer[]>

  @Column()
  webhookUrl: string

  @ManyToMany(() => StripeAccount, (stripeAccount) => stripeAccount.tenants)
  stripeAccounts: Relation<StripeAccount[]>

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
