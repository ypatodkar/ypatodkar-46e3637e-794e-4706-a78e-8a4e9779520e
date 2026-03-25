import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { Task } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User]), AuditLogModule],
  controllers: [TasksController],
  providers: [TasksService, RolesGuard],
})
export class TasksModule {}
