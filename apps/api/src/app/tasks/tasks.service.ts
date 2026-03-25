import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RequestUser } from '@task-mgmt/auth';
import { TaskPriority, TaskStatus, UserRole } from '@task-mgmt/data';
import { In, Repository } from 'typeorm';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { OrganizationScopeService } from '../organization-scope/organization-scope.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export interface TaskListQuery {
  status?: TaskStatus;
  category?: string;
}

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly audit: AuditLogService,
    private readonly orgScope: OrganizationScopeService
  ) {}

  async create(dto: CreateTaskDto, user: RequestUser): Promise<Task> {
    const scopeIds = await this.orgScope.visibleOrganizationIds(user);
    if (dto.assigneeId) {
      const assignee = await this.users.findOne({
        where: { id: dto.assigneeId, organizationId: In(scopeIds) },
      });
      if (!assignee) {
        throw new BadRequestException(
          'Assignee must belong to your organization (or your subtree if you are Owner)'
        );
      }
    }
    const task = this.tasks.create({
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      assigneeId: dto.assigneeId ?? null,
      creatorId: user.userId,
      organizationId: user.organizationId,
      status: TaskStatus.OPEN,
      sortOrder: 0,
    });
    const saved = await this.tasks.save(task);
    await this.audit.record({
      userId: user.userId,
      organizationId: saved.organizationId,
      action: 'CREATE_TASK',
      resourceType: 'TASK',
      resourceId: saved.id,
      result: 'SUCCESS',
      metadata: { title: saved.title },
    });
    return this.withOrgName(saved);
  }

  async findAll(user: RequestUser, query: TaskListQuery): Promise<Task[]> {
    const scopeIds = await this.orgScope.visibleOrganizationIds(user);
    const qb = this.tasks
      .createQueryBuilder('t')
      .where('t.organizationId IN (:...scopeIds)', { scopeIds })
      .andWhere('t.deletedAt IS NULL');
    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.category) {
      qb.andWhere('t.category = :category', { category: query.category });
    }
    qb.orderBy('t.sortOrder', 'ASC').addOrderBy('t.createdAt', 'DESC');
    const rows = await qb.getMany();
    return this.withOrgNames(rows);
  }

  async findOne(id: string, user: RequestUser): Promise<Task> {
    const task = await this.findOneEntity(id, user);
    return this.withOrgName(task);
  }

  private async findOneEntity(id: string, user: RequestUser): Promise<Task> {
    const scopeIds = await this.orgScope.visibleOrganizationIds(user);
    const task = await this.tasks.findOne({
      where: { id, organizationId: In(scopeIds) },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    user: RequestUser
  ): Promise<Task> {
    const task = await this.findOneEntity(id, user);
    if (user.role === UserRole.VIEWER) {
      this.assertViewerCanUpdate(task, user, dto);
    }
    const scopeIds = await this.orgScope.visibleOrganizationIds(user);
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.category !== undefined) task.category = dto.category;
    if (dto.dueDate !== undefined) {
      task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    if (dto.sortOrder !== undefined) task.sortOrder = dto.sortOrder;
    if (dto.assigneeId !== undefined) {
      if (user.role === UserRole.VIEWER) {
        throw new ForbiddenException();
      }
      if (dto.assigneeId) {
        const assignee = await this.users.findOne({
          where: { id: dto.assigneeId, organizationId: In(scopeIds) },
        });
        if (!assignee) {
          throw new BadRequestException(
            'Assignee must belong to your organization (or your subtree if you are Owner)'
          );
        }
      }
      task.assigneeId = dto.assigneeId;
    }
    if (dto.status !== undefined) {
      this.assertStatusTransition(task.status, dto.status, user.role);
      task.status = dto.status;
    }
    const saved = await this.tasks.save(task);
    await this.audit.record({
      userId: user.userId,
      organizationId: saved.organizationId,
      action: 'UPDATE_TASK',
      resourceType: 'TASK',
      resourceId: saved.id,
      result: 'SUCCESS',
      metadata: { fields: Object.keys(dto) },
    });
    return this.withOrgName(saved);
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const task = await this.findOneEntity(id, user);
    await this.tasks.softRemove(task);
    await this.audit.record({
      userId: user.userId,
      organizationId: task.organizationId,
      action: 'DELETE_TASK',
      resourceType: 'TASK',
      resourceId: id,
      result: 'SUCCESS',
    });
  }

  private async withOrgName(task: Task): Promise<Task> {
    const names = await this.orgScope.organizationNamesById([
      task.organizationId,
    ]);
    return Object.assign(task, {
      organizationName: names.get(task.organizationId) ?? '',
    });
  }

  private async withOrgNames(tasks: Task[]): Promise<Task[]> {
    if (tasks.length === 0) {
      return [];
    }
    const ids = [...new Set(tasks.map((t) => t.organizationId))];
    const names = await this.orgScope.organizationNamesById(ids);
    return tasks.map((t) =>
      Object.assign(t, {
        organizationName: names.get(t.organizationId) ?? '',
      })
    );
  }

  private assertViewerCanUpdate(
    task: Task,
    user: RequestUser,
    dto: UpdateTaskDto
  ): void {
    if (task.assigneeId !== user.userId) {
      throw new ForbiddenException('You can only update tasks assigned to you');
    }
    const keys = Object.keys(dto).filter(
      (k) => (dto as Record<string, unknown>)[k] !== undefined
    );
    const allowed = new Set(['status', 'sortOrder']);
    const bad = keys.filter((k) => !allowed.has(k));
    if (bad.length) {
      throw new ForbiddenException(
        `Viewers may only update: status, sortOrder (got: ${bad.join(', ')})`
      );
    }
    if (dto.status === TaskStatus.VERIFIED) {
      throw new ForbiddenException('Viewers cannot verify tasks');
    }
    if (dto.status !== undefined) {
      const valid =
        (task.status === TaskStatus.OPEN &&
          dto.status === TaskStatus.IN_PROGRESS) ||
        (task.status === TaskStatus.IN_PROGRESS &&
          dto.status === TaskStatus.DONE);
      if (!valid) {
        throw new ForbiddenException('Invalid status transition for viewer');
      }
    }
  }

  private assertStatusTransition(
    from: TaskStatus,
    to: TaskStatus,
    role: UserRole
  ): void {
    if (role === UserRole.VIEWER) {
      return;
    }
    if (from === to) {
      return;
    }
    const adminOwnerAllowed = new Set([
      TaskStatus.OPEN,
      TaskStatus.IN_PROGRESS,
      TaskStatus.DONE,
      TaskStatus.VERIFIED,
    ]);
    if (!adminOwnerAllowed.has(to)) {
      throw new BadRequestException('Invalid status');
    }
  }
}
