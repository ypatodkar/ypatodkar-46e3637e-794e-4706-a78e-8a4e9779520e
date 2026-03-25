import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { OrganizationTreeRow } from '@task-mgmt/data';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrganizationsApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<OrganizationTreeRow[]> {
    return this.http.get<OrganizationTreeRow[]>('/api/organizations');
  }
}
