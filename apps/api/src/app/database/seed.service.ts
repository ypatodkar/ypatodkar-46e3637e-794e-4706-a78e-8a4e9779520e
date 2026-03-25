import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TaskCategory, TaskPriority, TaskStatus, UserRole } from '@task-mgmt/data';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Task)
    private readonly tasks: Repository<Task>
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.log.log('Ensuring demo organizations and accounts (idempotent)…');
    const hash = await bcrypt.hash('password123', 10);

    const parent = await this.getOrCreateRootOrg('Acme Corp');
    const engineering = await this.getOrCreateChildOrg('Engineering', parent.id);
    const marketing = await this.getOrCreateChildOrg('Marketing', parent.id);

    const acmeOwner = await this.ensureUser(
      {
        email: 'owner.acme@demo.local',
        name: 'Owner 1',
        role: UserRole.OWNER,
        organizationId: parent.id,
      },
      hash
    );
    const acmeAdmin = await this.ensureUser(
      {
        email: 'admin.acme@demo.local',
        name: 'Admin 1',
        role: UserRole.ADMIN,
        organizationId: parent.id,
      },
      hash
    );
    const acmeViewer = await this.ensureUser(
      {
        email: 'viewer.acme@demo.local',
        name: 'Viewer 1',
        role: UserRole.VIEWER,
        organizationId: parent.id,
      },
      hash
    );

    const engOwner = await this.ensureUser(
      {
        email: 'owner@demo.local',
        name: 'Owner 2',
        role: UserRole.OWNER,
        organizationId: engineering.id,
      },
      hash
    );
    const engAdmin = await this.ensureUser(
      {
        email: 'admin@demo.local',
        name: 'Admin 2',
        role: UserRole.ADMIN,
        organizationId: engineering.id,
      },
      hash
    );
    const engViewer = await this.ensureUser(
      {
        email: 'viewer@demo.local',
        name: 'Viewer 2',
        role: UserRole.VIEWER,
        organizationId: engineering.id,
      },
      hash
    );

    const mktOwner = await this.ensureUser(
      {
        email: 'owner.marketing@demo.local',
        name: 'Owner 3',
        role: UserRole.OWNER,
        organizationId: marketing.id,
      },
      hash
    );
    const mktAdmin = await this.ensureUser(
      {
        email: 'admin.marketing@demo.local',
        name: 'Admin 3',
        role: UserRole.ADMIN,
        organizationId: marketing.id,
      },
      hash
    );
    const mktViewer = await this.ensureUser(
      {
        email: 'viewer.marketing@demo.local',
        name: 'Viewer 3',
        role: UserRole.VIEWER,
        organizationId: marketing.id,
      },
      hash
    );

    const taskCount = await this.tasks.count();
    if (taskCount === 0) {
      await this.tasks.save([
        this.tasks.create({
          title: 'Board-level security review',
          category: TaskCategory.MAINTENANCE,
          priority: TaskPriority.HIGH,
          status: TaskStatus.OPEN,
          sortOrder: 0,
          creatorId: acmeAdmin.id,
          organizationId: parent.id,
          assigneeId: acmeViewer.id,
        }),
        this.tasks.create({
          title: 'FY policy acknowledgment',
          category: TaskCategory.FEATURE,
          priority: TaskPriority.LOW,
          status: TaskStatus.IN_PROGRESS,
          sortOrder: 1,
          creatorId: acmeOwner.id,
          organizationId: parent.id,
          assigneeId: acmeViewer.id,
        }),
        this.tasks.create({
          title: 'Ship RBAC task board',
          description: 'Nest + Angular + JWT',
          category: TaskCategory.FEATURE,
          priority: TaskPriority.HIGH,
          status: TaskStatus.OPEN,
          sortOrder: 0,
          creatorId: engAdmin.id,
          organizationId: engineering.id,
          assigneeId: engViewer.id,
        }),
        this.tasks.create({
          title: 'Fix login redirect',
          description: null,
          category: TaskCategory.BUG,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.IN_PROGRESS,
          sortOrder: 1,
          creatorId: engAdmin.id,
          organizationId: engineering.id,
          assigneeId: engViewer.id,
        }),
        this.tasks.create({
          title: 'Write README',
          category: TaskCategory.MAINTENANCE,
          priority: TaskPriority.LOW,
          status: TaskStatus.DONE,
          sortOrder: 2,
          creatorId: engOwner.id,
          organizationId: engineering.id,
          assigneeId: engAdmin.id,
        }),
        this.tasks.create({
          title: 'Q2 campaign brief',
          category: TaskCategory.RESEARCH,
          priority: TaskPriority.HIGH,
          status: TaskStatus.OPEN,
          sortOrder: 0,
          creatorId: mktAdmin.id,
          organizationId: marketing.id,
          assigneeId: mktViewer.id,
        }),
        this.tasks.create({
          title: 'Website copy refresh',
          category: TaskCategory.IMPROVEMENT,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.IN_PROGRESS,
          sortOrder: 1,
          creatorId: mktOwner.id,
          organizationId: marketing.id,
          assigneeId: mktViewer.id,
        }),
      ]);
      this.log.log('Inserted demo tasks.');
    }

    this.log.log(
      'Demo data ready. Acme: *.acme@ — Engineering: owner@ / admin@ / viewer@ — Marketing: *.marketing@ (password: password123)'
    );
  }

  private async getOrCreateRootOrg(name: string): Promise<Organization> {
    const existing = await this.orgs
      .createQueryBuilder('o')
      .where('o.name = :name', { name })
      .andWhere('o.parent_organization_id IS NULL')
      .getOne();
    if (existing) {
      return existing;
    }
    return this.orgs.save(this.orgs.create({ name }));
  }

  private async getOrCreateChildOrg(
    name: string,
    parentId: string
  ): Promise<Organization> {
    const existing = await this.orgs
      .createQueryBuilder('o')
      .where('o.name = :name', { name })
      .andWhere('o.parent_organization_id = :pid', { pid: parentId })
      .getOne();
    if (existing) {
      return existing;
    }
    const parent = await this.orgs.findOneOrFail({ where: { id: parentId } });
    return this.orgs.save(this.orgs.create({ name, parent }));
  }

  private async ensureUser(
    profile: {
      email: string;
      name: string;
      role: UserRole;
      organizationId: string;
    },
    passwordHash: string
  ): Promise<User> {
    const email = profile.email.trim().toLowerCase();
    const found = await this.users.findOne({ where: { email } });
    if (found) {
      if (found.name !== profile.name) {
        found.name = profile.name;
        return this.users.save(found);
      }
      return found;
    }
    return this.users.save(
      this.users.create({
        name: profile.name,
        email,
        role: profile.role,
        organizationId: profile.organizationId,
        passwordHash,
      })
    );
  }
}
