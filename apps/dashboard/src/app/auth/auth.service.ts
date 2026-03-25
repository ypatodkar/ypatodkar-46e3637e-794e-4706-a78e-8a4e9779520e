import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthUserView } from '@task-mgmt/data';
import { tap } from 'rxjs';

const LS_TOKEN = 'tm_token';
const LS_USER = 'tm_user';

export interface LoginResponse {
  access_token: string;
  user: AuthUserView;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(null);
  readonly user = signal<AuthUserView | null>(null);

  constructor() {
    const t = localStorage.getItem(LS_TOKEN);
    const u = localStorage.getItem(LS_USER);
    this.token.set(t);
    if (u) {
      try {
        this.user.set(JSON.parse(u) as AuthUserView);
      } catch {
        localStorage.removeItem(LS_USER);
      }
    }
  }

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>('/api/auth/login', { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(LS_TOKEN, res.access_token);
          localStorage.setItem(LS_USER, JSON.stringify(res.user));
          this.token.set(res.access_token);
          this.user.set(res.user);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    this.token.set(null);
    this.user.set(null);
    void this.router.navigateByUrl('/login');
  }
}
