import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../entities/organization.entity';
import { OrganizationScopeService } from './organization-scope.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  providers: [OrganizationScopeService],
  exports: [OrganizationScopeService],
})
export class OrganizationScopeModule {}
