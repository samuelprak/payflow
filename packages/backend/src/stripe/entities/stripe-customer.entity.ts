import { Customer } from "src/customer/entities/customer.entity"
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
  RelationId,
  Unique,
  UpdateDateColumn,
} from "typeorm"

@Entity()
@Unique(["customer"])
export class StripeCustomer {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(() => Customer)
  @JoinColumn()
  customer: Relation<Customer>

  @RelationId((stripeCustomer: StripeCustomer) => stripeCustomer.customer)
  customerId: string

  @Column()
  stripeCustomerId: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
