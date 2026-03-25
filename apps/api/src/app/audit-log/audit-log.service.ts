import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RequestUser } from '@task-mgmt/auth';
import type { AuditLogView } from '@task-mgmt/data';
import { In, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { User } from '../entities/user.entity';
import { OrganizationScopeService } from '../organization-scope/organization-scope.service';

export type AuditResult = 'SUCCESS' | 'FAILURE';

@Injectable()
export class AuditLogService {
  private readonly log = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
    private readonly orgScope: OrganizationScopeService
  ) {}

  async record(params: {
    userId: string;
    organizationId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    result: AuditResult;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const row = this.repo.create({
      userId: params.userId,
      organizationId: params.organizationId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      result: params.result,
      metadata: params.metadata ?? null,
    });
    await this.repo.save(row);
    const when = new Date().toISOString();
    const target =
      params.resourceId != null ? ` id=${params.resourceId}` : '';
    this.log.log(
      `[AUDIT] ${when} ${params.result} | user=${params.userId} | org=${params.organizationId} | ${params.action} ${params.resourceType}${target}`
    );
  }

  async findForOrganization(organizationId: string): Promise<AuditLog[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: 500,
    });
  }

  /** Owner: logs across org + descendants; others: own org only. */
  async findForVisibleOrganizations(
    actor: RequestUser
  ): Promise<AuditLogView[]> {
    const scopeIds = await this.orgScope.visibleOrganizationIds(actor);
    if (scopeIds.length === 0) {
      return [];
    }
    const rows = await this.repo.find({
      where: { organizationId: In(scopeIds) },
      relations: { user: true, organization: true },
      order: { createdAt: 'DESC' },
      take: 500,
    });

    const orgIdsMissingName = new Set<string>();
    const userIdsMissingName = new Set<string>();
    for (const a of rows) {
      if (a.organizationId && !a.organization?.name) {
        orgIdsMissingName.add(a.organizationId);
      }
      if (a.userId && !a.user?.name) {
        userIdsMissingName.add(a.userId);
      }
    }

    const orgNameById =
      orgIdsMissingName.size > 0
        ? await this.orgScope.organizationNamesById([...orgIdsMissingName])
        : new Map<string, string>();

    const userNameById =
      userIdsMissingName.size > 0
        ? await this.loadUserNamesById([...userIdsMissingName])
        : new Map<string, { name: string; email: string }>();

    return rows.map((a) =>
      this.toAuditLogView(a, orgNameById, userNameById)
    );
  }

  private async loadUserNamesById(
    ids: string[]
  ): Promise<Map<string, { name: string; email: string }>> {
    if (ids.length === 0) {
      return new Map();
    }
    const repo = this.repo.manager.getRepository(User);
    const users = await repo.find({
      where: { id: In(ids) },
      select: ['id', 'name', 'email'],
    });
    return new Map(users.map((u) => [u.id, { name: u.name, email: u.email }]));
  }

  private toAuditLogView(
    a: AuditLog,
    orgNameById?: Map<string, string>,
    userNameById?: Map<string, { name: string; email: string }>
  ): AuditLogView {
    const createdAt =
      a.createdAt instanceof Date
        ? a.createdAt.toISOString()
        : String(a.createdAt);
    const userFallback = userNameById?.get(a.userId);
    return {
      id: a.id,
      userId: a.userId,
      organizationId: a.organizationId,
      action: a.action,
      resourceType: a.resourceType,
      resourceId: a.resourceId,
      result: a.result,
      metadata: a.metadata,
      createdAt,
      userName: a.user?.name ?? userFallback?.name,
      userEmail: a.user?.email ?? userFallback?.email,
      organizationName:
        a.organization?.name ?? orgNameById?.get(a.organizationId),
    };
  }
}
