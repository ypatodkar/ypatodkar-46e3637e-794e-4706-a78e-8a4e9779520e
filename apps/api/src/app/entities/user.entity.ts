import { UserRole } from '@task-mgmt/data';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Task } from './task.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', length: 32 })
  role: UserRole;

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  organizationId: string;

  /** Optional mock permission matrix for Team UI (clamped to role). */
  @Column({ type: 'simple-json', nullable: true, name: 'team_permission_overrides' })
  teamPermissionOverrides: Record<string, boolean> | null;

  @OneToMany(() => Task, (task) => task.creator)
  createdTasks: Task[];

  @OneToMany(() => Task, (task) => task.assignee)
  assignedTasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
