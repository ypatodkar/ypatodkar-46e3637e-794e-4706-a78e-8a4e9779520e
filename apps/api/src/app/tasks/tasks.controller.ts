import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles, type RequestUser } from '@task-mgmt/auth';
import { TaskStatus, UserRole } from '@task-mgmt/data';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(RolesGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: RequestUser) {
    return this.tasks.create(dto, user);
  }

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: TaskStatus,
    @Query('category') category?: string
  ) {
    return this.tasks.findAll(user, { status, category });
  }

  @Get(':id')
  one(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser
  ) {
    return this.tasks.findOne(id, user);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: RequestUser
  ) {
    return this.tasks.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser
  ) {
    return this.tasks.remove(id, user);
  }
}
