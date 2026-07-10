import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_states' })
@Unique(['username'])
@Unique(['displayHandle'])
export class UserStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  displayHandle!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin!: boolean;

  // Keep the full game snapshot so client-side fields can migrate server-side incrementally.
  @Column({ type: 'simple-json' })
  state!: Record<string, any>;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}