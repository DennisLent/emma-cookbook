import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../auth.service';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  provider = environment.authProvider;

  form = {
    username: '',
    password: '',
    password2: '',
    bio: '',
    avatar: null as File | null,
  };
  hidePassword = true;
  error = '';

  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;

  constructor(private auth: AuthService) {}

  register() {
    if (this.provider === 'keycloak') {
      this.auth.login({ offline: true });
      return;
    }
    this.error = '';
    this.auth.register(this.form as any).subscribe({
      next: () => (window.location.href = '/login'),
      error: (err) => (this.error = err.error?.password || 'Registration failed'),
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) this.form.avatar = file;
  }

  triggerAvatarInput() {
    this.avatarInput.nativeElement.click();
  }
}
