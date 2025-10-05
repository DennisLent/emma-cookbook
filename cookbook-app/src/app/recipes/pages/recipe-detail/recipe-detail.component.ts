import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RecipeService } from '../../recipes.service';
import { Recipe, Comment } from '../../recipes.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../auth/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin, of } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-recipe-detail',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss']
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe & {
    prep_time?: string;
    cook_time?: string;
    total_time?: string;
    comments?: Comment[];
  } | null = null;

  loading = true;
  error: string | null = null;

  ingredientChecks: boolean[] = [];
  instructionsArray: string[] = [];

  placeholderImage = 'assets/fallback-image.png';
  emptyCommentsImage = 'assets/empty.png';

  // Interaction state
  ratingInput: number = 0;
  commentInput: string = '';

  constructor(
    private route: ActivatedRoute,
    private recipeService: RecipeService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = 'Invalid recipe ID';
      this.loading = false;
      return;
    }

    this.recipeService.getById(id).subscribe({
      next: (data) => {
        this.recipe = data as any; // cast to include times & comments
        this.ingredientChecks = data.ingredients.map(() => false);
        this.instructionsArray = data.instructions
          .split('\n')
          .map(s => s.trim())
          .filter(s => s);

        // Initialize rating input from my_rating
        if ((this.recipe as any).my_rating) {
          this.ratingInput = (this.recipe as any).my_rating as number;
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch recipe:', err);
        this.error = 'Recipe not found or failed to load.';
        this.loading = false;
      }
    });
  }

  isLoggedIn(): boolean { return this.auth.isLoggedInSync(); }

  toggleFavorite() {
    if (!this.recipe || !this.isLoggedIn()) return;
    const r = this.recipe;
    const call = r.is_favorited ? this.recipeService.unfavoriteRecipe(r.id) : this.recipeService.favoriteRecipe(r.id);
    call.subscribe({
      next: res => {
        r.is_favorited = res.is_favorited;
        r.favorites_count = res.favorites_count;
      },
      error: err => console.error('Favorite toggle failed', err)
    });
  }

  setRating(stars: number) {
    if (!this.recipe || !this.isLoggedIn()) return;
    this.ratingInput = stars;
  }

  submitFeedback() {
    if (!this.recipe || !this.isLoggedIn()) return;
    const id = this.recipe.id;

    const calls = [] as any[];
    if (this.ratingInput && this.ratingInput >= 1 && this.ratingInput <= 5) {
      calls.push(this.recipeService.rateRecipe(id, this.ratingInput));
    }
    if (this.commentInput && this.commentInput.trim().length) {
      calls.push(this.recipeService.addComment(id, this.commentInput.trim()));
    }

    if (!calls.length) return;

    forkJoin(calls).subscribe({
      next: () => {
        this.recipeService.getById(id).subscribe(r => this.recipe = r as any);
        this.commentInput = '';
      },
      error: err => console.error('Failed to submit feedback', err)
    });
  }
}
