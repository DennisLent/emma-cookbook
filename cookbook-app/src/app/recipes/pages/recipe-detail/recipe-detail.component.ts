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

  // User layout preference
  layoutOrder: string[] = ['title','description','meta','ingredients','steps','comments'];
  renderBlocks: (string | { type: 'grid', blocks: ('ingredients'|'steps')[] })[] = [];
  detailColumns: 1 | 2 = 2;
  layoutMode: 'list' | 'grid' = 'grid';
  boardCols: string[][] = [[],[],[]];
  boardColumns: 1 | 2 | 3 = 3;
  boardWidths: number[] = [1,1,1];
  isMobile = false;

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
        this.computeRenderBlocks();
      },
      error: (err) => {
        console.error('Failed to fetch recipe:', err);
        this.error = 'Recipe not found or failed to load.';
        this.loading = false;
      }
    });

    // Fetch layout preference (best-effort)
    try {
      if (this.auth.isLoggedInSync()) {
        this.auth.getCurrentUser().subscribe({
          next: (user: any) => {
            const saved = user?.layout?.recipeDetail as string[] | undefined;
            if (Array.isArray(saved) && saved.length) this.layoutOrder = [...saved];
            const boardColsCount = (user?.layout?.recipeDetailColumns as 1|2|3) || 3;
            this.boardColumns = boardColsCount;
            // Grid mode (we stick to grid)
            const mode = (user?.layout?.recipeDetailMode as 'list'|'grid') || 'grid';
            const board = user?.layout?.recipeDetailBoard as string[][] | undefined;
            const grid = user?.layout?.recipeDetailGrid as { left: string[]; right: string[] }[] | undefined; // legacy experimental
            if (mode) this.layoutMode = mode;
            if (Array.isArray(board) && board.length) {
              this.boardCols = board.map(col => Array.isArray(col) ? [...col].filter(x => x !== 'comments') : []);
              while (this.boardCols.length < 3) this.boardCols.push([]);
              if (this.boardCols.length > this.boardColumns) this.boardCols = this.boardCols.slice(0, this.boardColumns);
            } else if (Array.isArray(grid) && grid.length) {
              // Legacy conversion
              const flattened = (grid as any[]).flatMap(r => [...(r.left||[]), ...(r.right||[])]);
              this.boardCols = [[],[],[]];
              flattened.forEach((it, idx) => this.boardCols[idx % 3].push(it));
            }
            // Column widths
            const w = user?.layout?.recipeDetailBoardWidths as number[] | undefined;
            if (Array.isArray(w) && w.length) this.boardWidths = w;
            // Fallback to localStorage if missing
            if (!saved || !saved.length) {
              const ls = localStorage.getItem('layout_recipe_detail');
              if (ls) {
                const arr = JSON.parse(ls);
                if (Array.isArray(arr)) this.layoutOrder = arr;
              }
            }
            const lsc = localStorage.getItem('layout_recipe_detail_columns');
            if (lsc) {
              const n = parseInt(lsc,10);
              this.boardColumns = (n === 1 ? 1 : n === 2 ? 2 : 3);
            }
            // Local storage for mode & grid
            const lsm = localStorage.getItem('layout_recipe_detail_mode');
            if (lsm === 'grid' || lsm === 'list') this.layoutMode = lsm as any;
            const lsb = localStorage.getItem('layout_recipe_detail_board') || localStorage.getItem('layout_recipe_detail_grid');
            if (lsb) {
              try {
                const parsed = JSON.parse(lsb);
                if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
                  this.boardCols = parsed.map((c: string[]) => Array.isArray(c) ? c.filter(x => x !== 'comments') : []);
                } else if (Array.isArray(parsed)) {
                  const flat = parsed.flatMap((r: any) => [...(r.left||[]), ...(r.right||[])]);
                  this.boardCols = [[],[],[]];
                  flat.forEach((it: string, idx: number) => this.boardCols[idx % 3].push(it));
                }
              } catch {}
            }
            const lsw = localStorage.getItem('layout_recipe_detail_board_widths');
            if (lsw) {
              try { const arrw = JSON.parse(lsw); if (Array.isArray(arrw) && arrw.length) this.boardWidths = arrw; } catch {}
            }
            this.initMobileDetection();
            this.computeRenderBlocks();
          }
        });
      } else {
        // fallback to localStorage if present
        const ls = localStorage.getItem('layout_recipe_detail');
        if (ls) {
          const arr = JSON.parse(ls);
          if (Array.isArray(arr)) this.layoutOrder = arr;
          const lsc = localStorage.getItem('layout_recipe_detail_columns');
          if (lsc) {
            const n = parseInt(lsc,10);
            this.boardColumns = (n === 1 ? 1 : n === 2 ? 2 : 3);
          }
          const lsm = localStorage.getItem('layout_recipe_detail_mode');
          if (lsm === 'grid' || lsm === 'list') this.layoutMode = lsm as any;
          const lsb = localStorage.getItem('layout_recipe_detail_board') || localStorage.getItem('layout_recipe_detail_grid');
          if (lsb) {
            try {
              const parsed = JSON.parse(lsb);
              if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
                this.boardCols = parsed.map((c: string[]) => Array.isArray(c) ? c.filter(x => x !== 'comments') : []);
              } else if (Array.isArray(parsed)) {
                const flat = parsed.flatMap((r: any) => [...(r.left||[]), ...(r.right||[])]);
                this.boardCols = [[],[],[]];
                flat.forEach((it: string, idx: number) => this.boardCols[idx % 3].push(it));
              }
            } catch {}
          }
          const lsw = localStorage.getItem('layout_recipe_detail_board_widths');
          if (lsw) {
            try { const arrw = JSON.parse(lsw); if (Array.isArray(arrw) && arrw.length) this.boardWidths = arrw; } catch {}
          }
          this.initMobileDetection();
          this.computeRenderBlocks();
        }
      }
    } catch {}
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

  // Layout helpers
  has(section: string) { return this.layoutOrder.includes(section); }
  indexOf(section: string) { return this.layoutOrder.indexOf(section); }
  ingredientsFirst(): boolean {
    const i = this.indexOf('ingredients');
    const s = this.indexOf('steps');
    if (i === -1) return false;
    if (s === -1) return true;
    return i <= s;
  }

  private computeRenderBlocks() {
    if (this.layoutMode === 'grid' && !this.isMobile && this.boardCols && this.boardCols.some(c => c.length)) {
      // In grid mode, board layout is rendered directly by template
      this.renderBlocks = [];
      return;
    }
    const out: (string | { type: 'grid', blocks: ('ingredients'|'steps')[] })[] = [];
    const o = this.layoutOrder || [];
    let i = 0;
    while (i < o.length) {
      const cur = o[i];
      const next = o[i + 1];
      const isCurIS = cur === 'ingredients' || cur === 'steps';
      const isNextIS = next === 'ingredients' || next === 'steps';
      if (!this.isMobile && this.detailColumns === 2 && isCurIS && isNextIS) {
        out.push({ type: 'grid', blocks: [cur as any, next as any] });
        i += 2;
      } else {
        out.push(cur);
        i += 1;
      }
    }
    this.renderBlocks = out;
  }

  isGrid(b: any): b is { type: 'grid', blocks: ('ingredients'|'steps')[] } {
    return b && b.type === 'grid';
  }

  boardGridTemplate(): string {
    const n = Math.max(1, Math.min(3, this.boardColumns || 3));
    const widths = (this.boardWidths || []).slice(0, n);
    // If looks like legacy 'fr' values (small ints), convert to percents
    const max = widths.length ? Math.max(...widths) : 0;
    const sum = widths.reduce((s, v) => s + v, 0);
    let percents = widths;
    if (max > 0 && max <= 4 && sum <= 12) {
      percents = widths.map((w, i) => i === widths.length - 1 ? 100 - Math.round(widths.slice(0, -1).reduce((s2, v2) => s2 + Math.round((v2 / sum) * 100), 0)) : Math.round((w / sum) * 100));
    }
    while (percents.length < n) percents.push(Math.floor(100 / n));
    // Use fr ratios to avoid grid-gap overflow
    return percents.map(w => `minmax(0, ${w}fr)`).join(' ');
  }

  private initMobileDetection() {
    try {
      const mq = window.matchMedia('(max-width: 767px)');
      const set = () => { this.isMobile = mq.matches; };
      set();
      if ((mq as any).addEventListener) (mq as any).addEventListener('change', set);
    } catch {}
  }
}
