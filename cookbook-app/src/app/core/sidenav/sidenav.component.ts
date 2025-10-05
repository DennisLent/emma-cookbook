import { Component } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgIconsModule } from '@ng-icons/core';
import { TranslatePipe } from '../i18n/translate.pipe';


@Component({
  standalone: true,
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    NgIconsModule,
    TranslatePipe
  ]
})
export class SidenavComponent {}
