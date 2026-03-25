import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { RequestUser } from '@task-mgmt/auth';
import { In, Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { OrganizationScopeService } from '../organization-scope/organization-scope.service';

export type OrganizationTreeRow = {
  id: string;
  name: string;
  parentOrganizationId: string | null;
};

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgs: Repository<Organization>,
    private readonly orgScope: OrganizationScopeService
  ) {}

  async listVisible(actor: RequestUser): Promise<OrganizationTreeRow[]> {
    const scopeIds = await this.orgScope.visibleOrganizationIds(actor);
    const rows = await this.orgs.find({
      where: { id: In(scopeIds) },
      relations: ['parent'],
      order: { name: 'ASC' },
    });
    return rows.map((o) => ({
      id: o.id,
      name: o.name,
      parentOrganizationId: o.parent?.id ?? null,
    }));
  }
}
