import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Recipe, Tag } from '../../recipes.model';
import { RecipeService } from '../../recipes.service';
import { AuthService } from '../../../auth/auth.service';
import { RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatChipsModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    SearchBarComponent
  ],
  templateUrl: './recipe-list.component.html',
  styleUrl: './recipe-list.component.scss'
})
export class RecipeListComponent implements OnInit, AfterViewInit, OnDestroy {
  recipes: Recipe[] = [];
  allTags: Tag[] = [];
  derivedTags: Tag[] = [];
  filteredRecipes: Recipe[] = [];
  recipeTitles: string[] = [];
  placeholderImage = 'assets/fallback-image.png';
  page = 1;
  loading = false;
  hasMore = true;
  lastSearch = { term: '', tags: [] as string[] };
  private observer?: IntersectionObserver;

  // Sorting
  sortChoice: 'rating_desc' | 'rating_asc' | 'favorites_desc' | 'favorites_asc' | '' = '';

  @ViewChild('anchor', { static: false }) anchor?: ElementRef<HTMLElement>;

  constructor(private recipeService: RecipeService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadRecipes();

    this.recipeService.getAllTags().subscribe({
      next: (data) => this.allTags = data,
      error: (err) => console.error('Failed to fetch tags', err)
    });

    // No carousel on the landing page for now
  }

  ngAfterViewInit(): void {
    if (this.anchor) {
      this.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadRecipes();
          }
        });
      });
      this.observer.observe(this.anchor.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  handleSearch({ term, tags }: { term: string; tags: string[] }) {
    this.lastSearch = { term, tags };
    const raw = term?.toLowerCase() ?? '';
    const tokens = raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    this.filteredRecipes = this.recipes.filter(r => {
      const tagMatch = (!tags.length) || tags.every(tag => r.tags.includes(tag));
      if (!raw) return tagMatch; // no text search

      const titleText = r.title.toLowerCase();
      const ingTexts = (r.ingredients || []).map(ing => `${ing.ingredient?.name || ''} ${ing.amount || ''}`.toLowerCase());

      if (!tokens.length) {
        // Single token or plain text (no commas)
        return tagMatch && (titleText.includes(raw) || ingTexts.some(t => t.includes(raw)));
      }

      // AND match for all tokens across title or any ingredient
      const allTokensMatch = tokens.every(tok =>
        titleText.includes(tok) || ingTexts.some(t => t.includes(tok))
      );
      return tagMatch && allTokensMatch;
    });
  }

  private loadRecipes() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    const opts = this.sortOptsFromChoice();
    this.recipeService.getRecipesPage(this.page, opts).subscribe({
      next: data => {
        this.recipes.push(...data.results);
        this.recipeTitles = this.recipes.map(r => r.title);
        // Fallback tags derived from loaded recipes (if backend tags are empty)
        const names = new Set<string>();
        this.recipes.forEach(r => r.tags?.forEach(t => names.add(t)));
        this.derivedTags = Array.from(names).sort().map((name, idx) => ({ id: idx, name } as Tag));
        this.hasMore = !!data.next;
        this.page++;
        this.loading = false;
        this.handleSearch(this.lastSearch);
      },
      error: err => {
        console.error('Failed to fetch recipes:', err);
        this.loading = false;
      }
    });
  }

  // Convert HH:MM:SS to total minutes
  minutes(duration: string | undefined | null): string {
    if (!duration) return '';
    const parts = duration.split(':').map(p => parseInt(p || '0', 10));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return '';
    const total = parts[0] * 60 + parts[1];
    return String(total);
  }

  isLoggedIn(): boolean { return this.auth.isLoggedInSync(); }

  toggleFavorite(e: MouseEvent, recipe: Recipe) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.isLoggedIn()) return;
    if (recipe.is_favorited) {
      this.recipeService.unfavoriteRecipe(recipe.id).subscribe({
        next: res => {
          recipe.is_favorited = res.is_favorited;
          recipe.favorites_count = res.favorites_count;
        },
        error: err => console.error('Unfavorite failed', err)
      });
    } else {
      this.recipeService.favoriteRecipe(recipe.id).subscribe({
        next: res => {
          recipe.is_favorited = res.is_favorited;
          recipe.favorites_count = res.favorites_count;
        },
        error: err => console.error('Favorite failed', err)
      });
    }
  }

  onSortChange(choice: string) {
    this.sortChoice = choice as any;
    // Reset list and refetch from page 1 with sorting
    this.page = 1;
    this.hasMore = true;
    this.recipes = [];
    this.filteredRecipes = [];
    this.loadRecipes();
  }

  private sortOptsFromChoice(): { sort?: 'rating'|'favorites'; direction?: 'asc'|'desc' } {
    if (!this.isLoggedIn() || !this.sortChoice) return {};
    if (this.sortChoice.startsWith('rating')) {
      return { sort: 'rating', direction: this.sortChoice.endsWith('asc') ? 'asc' : 'desc' };
    }
    if (this.sortChoice.startsWith('favorites')) {
      return { sort: 'favorites', direction: this.sortChoice.endsWith('asc') ? 'asc' : 'desc' };
    }
    return {};
  }
}
