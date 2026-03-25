import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  /** Shown in the demo credentials panel (same as seed / README). */
  readonly demoPassword = 'password123';

  readonly demoOrgs: {
    team: string;
    users: { label: string; email: string }[];
  }[] = [
    {
      team: 'Acme Corp',
      users: [
        { label: 'Owner 1', email: 'owner.acme@demo.local' },
        { label: 'Admin 1', email: 'admin.acme@demo.local' },
        { label: 'Viewer 1', email: 'viewer.acme@demo.local' },
      ],
    },
    {
      team: 'Engineering',
      users: [
        { label: 'Owner 2', email: 'owner@demo.local' },
        { label: 'Admin 2', email: 'admin@demo.local' },
        { label: 'Viewer 2', email: 'viewer@demo.local' },
      ],
    },
    {
      team: 'Marketing',
      users: [
        { label: 'Owner 3', email: 'owner.marketing@demo.local' },
        { label: 'Admin 3', email: 'admin.marketing@demo.local' },
        { label: 'Viewer 3', email: 'viewer.marketing@demo.local' },
      ],
    },
  ];

  readonly form = this.fb.nonNullable.group({
    email: ['admin@demo.local', [Validators.required, Validators.email]],
    password: ['password123', Validators.required],
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const email = raw.email.trim().toLowerCase();
    const password = raw.password;
    this.loading.set(true);
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/dashboard'),
      error: () => {
        this.loading.set(false);
        this.error.set('Invalid email or password.');
      },
      complete: () => this.loading.set(false),
    });
  }

  useDemoEmail(email: string): void {
    this.form.patchValue({ email });
  }
}
