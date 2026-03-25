import { TaskCategory, TaskPriority, TaskStatus } from '@task-mgmt/data';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 32, default: TaskStatus.OPEN })
  status: TaskStatus;

  @Column({ type: 'varchar', length: 32, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'varchar', length: 32 })
  category: TaskCategory;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToOne(() => User, (user) => user.createdTasks)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column()
  creatorId: string;

  @ManyToOne(() => User, (user) => user.assignedTasks, { nullable: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User;

  @Column({ nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => Organization, (org) => org.tasks)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column()
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;
}
