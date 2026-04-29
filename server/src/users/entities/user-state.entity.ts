import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_states' })
@Unique(['username'])
export class UserStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  // Keep the full game snapshot so client-side fields can migrate server-side incrementally.
  @Column({ type: 'simple-json' })
  state!: Record<string, any>;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}