import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Recipe } from '../../recipes.model';
import { RecipeService } from '../../recipes.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-meal-plan',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './meal-plan.component.html',
  styleUrl: './meal-plan.component.scss'
})
export class MealPlanComponent {
  diet: 'omnivore' | 'pescetarian' | 'vegetarian' | 'vegan' = 'omnivore';
  days = 7;
  mealsPerDay = 3;
  loading = false;
  plan: Recipe[][] = [];
  error = '';

  constructor(private recipes: RecipeService) {}

  generate() {
    this.error = '';
    this.loading = true;
    this.recipes.generatePlan(this.diet, this.days, this.mealsPerDay).subscribe({
      next: res => {
        this.plan = res.plan || [];
        this.loading = false;
      },
      error: err => {
        this.error = err.error?.detail || 'Failed to generate plan.';
        this.loading = false;
      }
    });
  }

  swap(dayIdx: number, mealIdx: number) {
    if (!this.plan.length) return;
    const current = this.plan[dayIdx]?.[mealIdx];
    if (!current) return;
    const existingIds = this.plan.flat().map(r => r.id);
    this.recipes.swapRecipeInPlan(this.diet, current.id, existingIds).subscribe({
      next: (rep) => {
        this.plan[dayIdx][mealIdx] = rep;
      },
      error: err => {
        this.error = err.error?.detail || 'Failed to swap recipe.';
      }
    });
  }

  protein(recipe: Recipe): string {
    const tag = (recipe.tags || []).find(t => t.startsWith('protein:'));
    return tag ? tag.split(':')[1] : 'unknown';
  }
}
