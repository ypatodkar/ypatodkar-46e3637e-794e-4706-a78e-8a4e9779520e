import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { AuditLogView, TaskView } from '@task-mgmt/data';
import { TaskCategory, TaskStatus } from '@task-mgmt/data';
import { Observable } from 'rxjs';

export interface CreateTaskBody {
  title: string;
  description?: string;
  category: TaskCategory;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
}

export type UpdateTaskBody = Partial<{
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string;
  category: TaskCategory;
  dueDate: string | null;
  sortOrder: number;
  assigneeId: string | null;
}>;

@Injectable({ providedIn: 'root' })
export class TasksApiService {
  private readonly http = inject(HttpClient);

  list(filters?: { status?: TaskStatus; category?: TaskCategory }): Observable<TaskView[]> {
    let params = new HttpParams();
    if (filters?.status) {
      params = params.set('status', filters.status);
    }
    if (filters?.category) {
      params = params.set('category', filters.category);
    }
    return this.http.get<TaskView[]>('/api/tasks', { params });
  }

  create(body: CreateTaskBody): Observable<TaskView> {
    return this.http.post<TaskView>('/api/tasks', body);
  }

  update(id: string, body: UpdateTaskBody): Observable<TaskView> {
    return this.http.put<TaskView>(`/api/tasks/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/tasks/${id}`);
  }

  auditLog(): Observable<AuditLogView[]> {
    return this.http.get<AuditLogView[]>('/api/audit-log');
  }
}
