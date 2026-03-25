import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { SeedService } from './database/seed.service';
import { AuditLog } from './entities/audit-log.entity';
import { Organization } from './entities/organization.entity';
import { Task } from './entities/task.entity';
import { User } from './entities/user.entity';
import { OrganizationsModule } from './organizations/organizations.module';
import { OrganizationScopeModule } from './organization-scope/organization-scope.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

function ensureDbDir(database: string): void {
  const full = isAbsolute(database)
    ? database
    : resolve(process.cwd(), database);
  const dir = dirname(full);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const database = config.get<string>('DB_PATH', 'data/taskmgmt.sqlite');
        ensureDbDir(database);
        return {
          type: 'sqlite',
          database,
          entities: [Organization, User, Task, AuditLog],
          synchronize: true,
        };
      },
    }),
    TypeOrmModule.forFeature([Organization, User, Task]),
    OrganizationScopeModule,
    AuthModule,
    TasksModule,
    UsersModule,
    OrganizationsModule,
    AuditLogModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    SeedService,
  ],
})
export class AppModule {}
