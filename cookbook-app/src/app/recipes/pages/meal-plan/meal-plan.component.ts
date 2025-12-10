import { Component, OnInit } from '@angular/core';
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
import { Router } from '@angular/router';

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
export class MealPlanComponent implements OnInit {
  private readonly storageKey = 'meal-plan-state';

  diet: 'omnivore' | 'pescetarian' | 'vegetarian' | 'vegan' = 'omnivore';
  days = 7;
  mealsPerDay = 3;
  loading = false;
  plan: Recipe[][] = [];
  error = '';

  constructor(private recipes: RecipeService, private router: Router) {}

  ngOnInit(): void {
    this.restoreState();
  }

  generate() {
    this.error = '';
    this.loading = true;
    this.recipes.generatePlan(this.diet, this.days, this.mealsPerDay).subscribe({
      next: res => {
        this.plan = res.plan || [];
        this.loading = false;
        this.persistState();
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
        this.persistState();
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

  goToRecipe(id: number) {
    this.persistState();
    this.router.navigate(['/recipes', id]);
  }

  private persistState() {
    try {
      const data = {
        diet: this.diet,
        days: this.days,
        mealsPerDay: this.mealsPerDay,
        plan: this.plan
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch {
      // localStorage might be unavailable; fail silently
    }
  }

  private restoreState() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.diet) this.diet = parsed.diet;
      if (parsed?.days) this.days = Number(parsed.days) || this.days;
      if (parsed?.mealsPerDay) this.mealsPerDay = Number(parsed.mealsPerDay) || this.mealsPerDay;
      if (Array.isArray(parsed?.plan)) this.plan = parsed.plan;
    } catch {
      // ignore parse issues
    }
  }
}
