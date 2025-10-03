import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../auth.service';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  provider = environment.authProvider;
  username = '';
  password = '';
  hidePassword = true;
  error = '';

  constructor(private auth: AuthService) {}

  login() {
    if (this.provider === 'keycloak') {
      this.auth.login();
      return;
    }
    this.error = '';
    this.auth.loginWithPassword(this.username, this.password).subscribe({
      next: (tokens) => {
        this.auth.saveTokens(tokens);
        window.location.href = '/';
      },
      error: () => (this.error = 'Invalid username or password')
    });
  }
}
