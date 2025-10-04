import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Recipe, Tag } from '../../recipes.model';
import { RecipeService } from '../../recipes.service';
import { RouterModule } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { SearchBarComponent } from '../../components/search-bar/search-bar.component';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatChipsModule,
    MatIconModule,
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

  @ViewChild('anchor', { static: false }) anchor?: ElementRef<HTMLElement>;

  constructor(private recipeService: RecipeService) {}

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
    this.recipeService.getRecipesPage(this.page).subscribe({
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
}
