import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm"

@Entity()
@Unique(["stripeEventId", "stripeAccountId"])
export class StripeWebhookEvent {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  stripeEventId: string

  @Column()
  stripeAccountId: string

  @CreateDateColumn()
  createdAt: Date
}
