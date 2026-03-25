import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { OrgUserView } from '@task-mgmt/data';
import { UserRole } from '@task-mgmt/data';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<OrgUserView[]> {
    return this.http.get<OrgUserView[]>('/api/users');
  }

  updateRole(userId: string, role: UserRole.ADMIN | UserRole.VIEWER): Observable<OrgUserView> {
    return this.http.patch<OrgUserView>(`/api/users/${userId}/role`, { role });
  }
}
