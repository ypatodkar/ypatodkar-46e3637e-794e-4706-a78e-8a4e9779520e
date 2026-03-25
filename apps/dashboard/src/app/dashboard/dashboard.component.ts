import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';
import type {
  AuditLogView,
  OrganizationTreeRow,
  OrgUserView,
  TaskView,
} from '@task-mgmt/data';
import {
  TaskCategory,
  TaskPriority,
  TaskStatus,
  UserRole,
} from '@task-mgmt/data';
import { AuthService } from '../auth/auth.service';
import type { UpdateTaskBody } from '../tasks/tasks-api.service';
import { TasksApiService } from '../tasks/tasks-api.service';
import { OrganizationsApiService } from '../organizations/organizations-api.service';
import { TeamOrgBranchComponent } from '../team/team-org-branch.component';
import { buildTeamTree } from '../team/team-tree.types';
import { UsersApiService } from '../users/users-api.service';

type ColumnMap = Record<TaskStatus, TaskView[]>;

const EMPTY_COLUMNS = (): ColumnMap => ({
  [TaskStatus.OPEN]: [],
  [TaskStatus.IN_PROGRESS]: [],
  [TaskStatus.DONE]: [],
  [TaskStatus.VERIFIED]: [],
});

type DashboardTab = 'tasks' | 'team';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    TeamOrgBranchComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(TasksApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly orgsApi = inject(OrganizationsApiService);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly TaskStatus = TaskStatus;
  readonly TaskCategory = TaskCategory;
  readonly TaskPriority = TaskPriority;
  readonly UserRole = UserRole;

  readonly statusOrder: TaskStatus[] = [
    TaskStatus.OPEN,
    TaskStatus.IN_PROGRESS,
    TaskStatus.DONE,
    TaskStatus.VERIFIED,
  ];

  readonly activeTab = signal<DashboardTab>('tasks');
  readonly columns = signal<ColumnMap>(EMPTY_COLUMNS());
  readonly categoryFilter = signal<TaskCategory | ''>('');
  readonly auditOpen = signal(false);
  readonly auditEntries = signal<
    import('@task-mgmt/data').AuditLogView[] | null
  >(null);
  readonly orgUsers = signal<OrgUserView[]>([]);
  readonly teamOrgs = signal<OrganizationTreeRow[]>([]);
  readonly teamLoading = signal(false);

  readonly canManageTasks = computed(() => {
    const r = this.auth.user()?.role;
    return r === UserRole.OWNER || r === UserRole.ADMIN;
  });

  readonly isOwner = computed(
    () => this.auth.user()?.role === UserRole.OWNER
  );

  readonly teamTree = computed(() =>
    buildTeamTree(this.teamOrgs(), this.orgUsers())
  );

  readonly canSeeAudit = computed(() => this.canManageTasks());

  readonly connectedLists = computed(() => {
    const base = [
      'list-OPEN',
      'list-IN_PROGRESS',
      'list-DONE',
    ];
    if (this.auth.user()?.role !== UserRole.VIEWER) {
      base.push('list-VERIFIED');
    }
    return base;
  });

  readonly createForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    category: [TaskCategory.FEATURE, Validators.required],
    priority: [TaskPriority.MEDIUM, Validators.required],
    dueDate: [''],
    assigneeId: [''],
  });

  readonly editForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: [''],
    category: [TaskCategory.FEATURE, Validators.required],
    priority: [TaskPriority.MEDIUM, Validators.required],
    dueDate: [''],
    assigneeId: [''],
    status: [TaskStatus.OPEN, Validators.required],
  });

  showCreate = signal(false);
  editingTaskId = signal<string | null>(null);
  readonly taskPendingDelete = signal<TaskView | null>(null);
  readonly deleteInProgress = signal(false);

  ngOnInit(): void {
    this.loadTasks();
    this.loadOrgUsersIfNeeded();
  }

  setTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
    if (tab === 'team' && this.isOwner()) {
      this.loadTeamData();
    }
  }

  loadOrgUsersIfNeeded(): void {
    if (!this.canManageTasks()) {
      return;
    }
    this.usersApi.list().subscribe((users) => this.orgUsers.set(users));
  }

  loadTeamData(): void {
    if (!this.isOwner()) {
      return;
    }
    this.teamLoading.set(true);
    forkJoin({
      users: this.usersApi.list(),
      orgs: this.orgsApi.list(),
    }).subscribe({
      next: ({ users, orgs }) => {
        this.orgUsers.set(users);
        this.teamOrgs.set(orgs);
      },
      complete: () => this.teamLoading.set(false),
    });
  }

  assigneeName(userId: string | null): string {
    if (!userId) return 'Unassigned';
    const u = this.orgUsers().find((x) => x.id === userId);
    return u?.name ?? userId.slice(0, 8) + '…';
  }

  assigneeEmail(userId: string | null): string {
    if (!userId) return '';
    const u = this.orgUsers().find((x) => x.id === userId);
    return u?.email ?? '';
  }

  assigneeTeamLabel(userId: string | null): string {
    if (!userId) return '';
    const u = this.orgUsers().find((x) => x.id === userId);
    return u?.organizationName ? u.organizationName : '';
  }

  loadTasks(): void {
    const cat = this.categoryFilter();
    this.api
      .list(cat ? { category: cat as TaskCategory } : undefined)
      .subscribe((tasks) => this.hydrateColumns(tasks));
  }

  private hydrateColumns(tasks: TaskView[]): void {
    const next = EMPTY_COLUMNS();
    for (const t of tasks) {
      next[t.status].push(t);
    }
    for (const s of this.statusOrder) {
      next[s].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    this.columns.set(next);
  }

  setCategoryFilter(value: string): void {
    this.categoryFilter.set(value as TaskCategory | '');
    this.loadTasks();
  }

  canDragTask(t: TaskView): boolean {
    const u = this.auth.user();
    if (!u) return false;
    if (u.role === UserRole.VIEWER) {
      return t.assigneeId === u.id;
    }
    return true;
  }

  drop(event: CdkDragDrop<TaskView[]>, targetStatus: TaskStatus): void {
    const task = event.previousContainer.data[event.previousIndex];
    if (!this.canDragTask(task)) {
      return;
    }
    if (this.auth.user()?.role === UserRole.VIEWER) {
      if (targetStatus === TaskStatus.VERIFIED) {
        return;
      }
    }
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const updates = event.container.data.map((row, i) =>
        this.api.update(row.id, { sortOrder: i })
      );
      forkJoin(updates).subscribe(() => this.loadTasks());
      return;
    }
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    this.api
      .update(task.id, {
        status: targetStatus,
        sortOrder: event.currentIndex,
      })
      .subscribe(() => this.loadTasks());
  }

  openCreate(): void {
    this.loadOrgUsersIfNeeded();
    this.showCreate.set(true);
  }

  closeCreate(): void {
    this.showCreate.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const v = this.createForm.getRawValue();
    const body = {
      title: v.title,
      description: v.description || undefined,
      category: v.category,
      priority: v.priority,
      dueDate: v.dueDate ? `${v.dueDate}T12:00:00.000Z` : undefined,
      assigneeId: v.assigneeId || undefined,
    };
    this.api.create(body).subscribe(() => {
      this.closeCreate();
      this.createForm.reset({
        title: '',
        description: '',
        category: TaskCategory.FEATURE,
        priority: TaskPriority.MEDIUM,
        dueDate: '',
        assigneeId: '',
      });
      this.loadTasks();
    });
  }

  openEdit(t: TaskView): void {
    if (!this.canManageTasks()) {
      return;
    }
    this.loadOrgUsersIfNeeded();
    this.editingTaskId.set(t.id);
    this.editForm.patchValue({
      title: t.title,
      description: t.description ?? '',
      category: t.category,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
      assigneeId: t.assigneeId ?? '',
      status: t.status,
    });
  }

  closeEdit(): void {
    this.editingTaskId.set(null);
  }

  submitEdit(): void {
    const id = this.editingTaskId();
    if (!id || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const v = this.editForm.getRawValue();
    const body: UpdateTaskBody = {
      title: v.title,
      description: v.description === '' ? null : v.description,
      category: v.category,
      priority: v.priority,
      status: v.status,
      dueDate: v.dueDate ? `${v.dueDate}T12:00:00.000Z` : null,
      assigneeId: v.assigneeId === '' ? null : v.assigneeId,
    };
    this.api.update(id, body).subscribe(() => {
      this.closeEdit();
      this.loadTasks();
    });
  }

  openDeleteConfirm(t: TaskView): void {
    if (this.editingTaskId() === t.id) {
      this.closeEdit();
    }
    this.taskPendingDelete.set(t);
  }

  closeDeleteConfirm(): void {
    this.taskPendingDelete.set(null);
    this.deleteInProgress.set(false);
  }

  confirmDeleteTask(): void {
    const t = this.taskPendingDelete();
    if (!t || this.deleteInProgress()) {
      return;
    }
    this.deleteInProgress.set(true);
    this.api.delete(t.id).subscribe({
      next: () => {
        this.closeDeleteConfirm();
        this.loadTasks();
      },
      error: () => this.deleteInProgress.set(false),
    });
  }

  verifyTask(t: TaskView): void {
    this.api
      .update(t.id, { status: TaskStatus.VERIFIED })
      .subscribe(() => this.loadTasks());
  }

  promoteToAdmin(u: OrgUserView): void {
    this.usersApi.updateRole(u.id, UserRole.ADMIN).subscribe(() => {
      this.loadTeamData();
    });
  }

  demoteToViewer(u: OrgUserView): void {
    this.usersApi.updateRole(u.id, UserRole.VIEWER).subscribe(() => {
      this.loadTeamData();
    });
  }

  toggleAudit(): void {
    if (this.auditOpen()) {
      this.auditOpen.set(false);
      return;
    }
    this.auditOpen.set(true);
    this.api.auditLog().subscribe((rows) => this.auditEntries.set(rows));
  }

  logout(): void {
    this.auth.logout();
  }

  labelStatus(s: TaskStatus): string {
    return s.replace(/_/g, ' ');
  }

  /** Tooltip / title for audit row (full identity). */
  auditActorTitle(a: AuditLogView): string {
    const parts = [a.userName, a.userEmail].filter(Boolean);
    if (parts.length) {
      return parts.join(' · ');
    }
    return `User id ${a.userId}`;
  }

  auditActionLine(a: AuditLogView): string {
    return `${a.action} · ${a.resourceType}`;
  }

  auditMetadataJson(a: AuditLogView): string | null {
    if (!a.metadata || Object.keys(a.metadata).length === 0) {
      return null;
    }
    try {
      return JSON.stringify(a.metadata);
    } catch {
      return null;
    }
  }
}
