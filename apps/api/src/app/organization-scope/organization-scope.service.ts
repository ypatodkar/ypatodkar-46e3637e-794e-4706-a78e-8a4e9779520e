import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RequestUser } from '@task-mgmt/auth';
import { UserRole } from '@task-mgmt/data';
import { In, Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';

/**
 * Owners see their org plus all descendants. Admin/Viewer see only their org node.
 */
@Injectable()
export class OrganizationScopeService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>
  ) {}

  /** Org IDs the actor may access for tasks, members list, audit, etc. */
  async visibleOrganizationIds(actor: RequestUser): Promise<string[]> {
    if (actor.role !== UserRole.OWNER) {
      return [actor.organizationId];
    }
    return this.subtreeOrganizationIds(actor.organizationId);
  }

  private async subtreeOrganizationIds(rootId: string): Promise<string[]> {
    const ids = [rootId];
    const children = await this.orgs.find({
      where: { parent: { id: rootId } },
      select: ['id'],
    });
    for (const c of children) {
      ids.push(...(await this.subtreeOrganizationIds(c.id)));
    }
    return ids;
  }

  async organizationNamesById(
    ids: string[]
  ): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.orgs.find({
      where: { id: In(ids) },
      select: ['id', 'name'],
    });
    return new Map(rows.map((o) => [o.id, o.name]));
  }
}
