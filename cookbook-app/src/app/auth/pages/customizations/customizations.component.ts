import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { AuthService } from '../../../auth/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '../../../core/i18n/translate.service';
import { ThemeService } from '../../../core/theme/theme.service';

type Language = 'en' | 'de' | 'es' | 'fr';

@Component({
  standalone: true,
  selector: 'app-customizations',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    DragDropModule
  ],
  templateUrl: './customizations.component.html',
  styleUrls: ['./customizations.component.scss']
})
export class CustomizationsComponent implements OnInit {
  // segmented sections
  section: 'language' | 'style' | 'recipes' = 'language';

  // server-backed user fields
  preferences: any = {};
  theme: { mainColor?: string; backgroundColor?: string; accentColor?: string; mode?: 'light' | 'dark' } = {};
  layout: {
    recipeView?: 'grid' | 'list';
    recipeDetailColumns?: 1 | 2 | 3; // now used as board column count
    recipeDetailMode?: 'list' | 'grid';
    recipeDetailGrid?: { left: string[]; right: string[] }[]; // legacy experimental
    recipeDetailBoard?: string[][]; // kanban board columns
    recipeDetailBoardWidths?: number[]; // widths per column in fr units
  } = {};

  // Recipe layout builder base (comments excluded since fixed at bottom)
  readonly DEFAULT_RECIPE_DETAIL: string[] = ['image','title','description','meta','ingredients','steps'];
  layoutActive: string[] = [];
  layoutAvailable: string[] = ['tags','author','nutrition'];

  // Board builder (kanban)
  layoutMode: 'list' | 'grid' = 'list'; // will effectively be 'grid' only
  boardCols: string[][] = [[], [], []];
  boardAvailable: string[] = [];
  readonly REQUIRED_BLOCKS: string[] = ['title','ingredients','steps'];
  // Column widths in percentages (sum ~ 100)
  boardWidths: number[] = [33,34,33];

  // transient UI state
  loading = true;
  saving = false;
  error = '';
  success = '';

  languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'German' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
  ];

  constructor(
    private auth: AuthService,
    private i18n: TranslateService,
    private themeSvc: ThemeService,
  ) {}

  ngOnInit(): void {
    this.auth.getCurrentUser().subscribe({
      next: (user: any) => {
        this.preferences = user.preferences || {};
        this.theme = {
          mainColor: user.theme?.mainColor || '#2563EB',
          backgroundColor: user.theme?.backgroundColor || '#F8FAFC',
          accentColor: user.theme?.accentColor || '#ff4081',
          mode: (user.theme?.mode as 'light' | 'dark') || 'light',
        };
        this.layout = {
          recipeView: user.layout?.recipeView || 'grid',
          recipeDetailColumns: (user.layout?.recipeDetailColumns as 1|2|3) || 3,
          recipeDetailMode: (user.layout?.recipeDetailMode as 'list'|'grid') || undefined,
          recipeDetailGrid: (user.layout?.recipeDetailGrid as { left: string[]; right: string[] }[] | undefined),
          recipeDetailBoard: (user.layout?.recipeDetailBoard as string[][] | undefined),
          recipeDetailBoardWidths: (user.layout?.recipeDetailBoardWidths as number[] | undefined)
        };
        const savedDetail = (user.layout?.recipeDetail as string[] | undefined);
        this.layoutActive = Array.isArray(savedDetail) && savedDetail.length
          ? [...savedDetail]
          : [...this.DEFAULT_RECIPE_DETAIL];

        // Initialize grid mode from user or localStorage
        const board = this.layout.recipeDetailBoard;
        const grid = this.layout.recipeDetailGrid; // legacy experimental
        // We now default to grid/board mode always
        this.layoutMode = 'grid';
        if (Array.isArray(board) && board.length) {
          this.boardCols = board.map(col => Array.isArray(col) ? [...col] : []).slice(0,3);
          while (this.boardCols.length < 3) this.boardCols.push([]);
        } else if (Array.isArray(grid) && grid.length) {
          // Legacy conversion: flatten row grid into 3 columns roughly
          const flattened = grid.flatMap(r => [...(r.left||[]), ...(r.right||[])]);
          this.boardCols = [[],[],[]];
          flattened.forEach((it, idx) => this.boardCols[idx % 3].push(it));
        } else {
          const lsBoard = localStorage.getItem('layout_recipe_detail_board');
          if (lsBoard) {
            try { const parsed = JSON.parse(lsBoard); if (Array.isArray(parsed)) this.boardCols = parsed; } catch {}
          }
        }
        if (!this.boardCols.filter(col => col.length).length) {
          // Seed sensible default without comments
          this.boardCols = [
            ['image','title','description'],
            ['meta','tags','author'],
            ['ingredients','steps']
          ];
        }
        // Read widths
        const widths = this.layout.recipeDetailBoardWidths;
        if (Array.isArray(widths) && widths.length) this.boardWidths = this.normalizePercents(widths);
        const lsW = localStorage.getItem('layout_recipe_detail_board_widths');
        if ((!widths || !widths.length) && lsW) {
          try { const w = JSON.parse(lsW); if (Array.isArray(w)) this.boardWidths = this.normalizePercents(w); } catch {}
        }
        // Sync column count and available
        const colCount = (this.layout.recipeDetailColumns as 1|2|3) || 3;
        this.syncColumnsCount(colCount);
        this.ensureDefaultPercents(colCount);
        this.recomputeAvailable();
        this.enforceRequiredInBoard();
        const lang = this.preferences?.language as Language | undefined;
        if (lang) this.i18n.setLanguage(lang);
        this.themeSvc.applyTheme(this.theme);
        this.loading = false;
      },
      error: () => {
        this.error = this.i18n.t('status.failedLoadPrefs');
        this.loading = false;
      }
    });
  }

  setSection(s: 'language' | 'style' | 'recipes') {
    this.section = s;
    this.success = '';
    this.error = '';
  }

  // Persist a subset of fields
  saveLanguage() {
    this.savePartial({ preferences: this.preferences });
    const lang = this.preferences?.language as Language | undefined;
    if (lang) {
      try {
        // Apply immediately in the UI
        this.i18n.setLanguage(lang);
        // Mirror to document and storage for persistence
        document.documentElement.lang = lang;
        localStorage.setItem('language', lang);
      } catch {}
    }
  }

  saveStyle() {
    this.savePartial({ theme: this.theme });
    try {
      localStorage.setItem('theme', JSON.stringify(this.theme));
    } catch {}
    this.themeSvc.applyTheme(this.theme);
  }

  // Live preview without saving
  previewTheme() {
    this.themeSvc.applyTheme(this.theme);
  }

  // Reset to defaults
  resetTheme() {
    this.theme = { mainColor: '#2563EB', backgroundColor: '#F8FAFC', accentColor: '#ff4081', mode: this.theme.mode || 'light' };
    this.previewTheme();
  }

  // Quick presets
  applyPreset(name: 'ocean' | 'forest' | 'rose' | 'slate' | 'amber') {
    const presets: Record<string, { main: string; bg: string; accent: string }> = {
      ocean: { main: '#1D4ED8', bg: '#EFF6FF', accent: '#06B6D4' },
      forest: { main: '#16A34A', bg: '#F0FDF4', accent: '#84CC16' },
      rose: { main: '#DB2777', bg: '#FFF1F2', accent: '#F97316' },
      slate: { main: '#475569', bg: '#F8FAFC', accent: '#94A3B8' },
      amber: { main: '#D97706', bg: '#FFFBEB', accent: '#E11D48' },
    };
    const p = presets[name];
    if (!p) return;
    this.theme = { ...this.theme, mainColor: p.main, backgroundColor: p.bg, accentColor: p.accent };
    this.previewTheme();
  }

  saveRecipes() {
    if (!this.isLayoutValid()) {
      const missing = this.computeMissingRequired();
      this.error = `Missing required sections: ${missing.join(', ')}`;
      return;
    }
    const layout = { ...this.layout } as any;
    layout.recipeDetailMode = 'grid';
    layout.recipeDetailColumns = this.layout.recipeDetailColumns as 1|2|3;
    layout.recipeDetailBoard = this.boardCols.map(col => [...col]);
    layout.recipeDetailBoardWidths = this.normalizePercents(this.boardWidths).slice(0, layout.recipeDetailColumns);
    // Linear fallback (col1->col2->col3)
    layout.recipeDetail = this.boardCols.flat();
    this.savePartial({ layout });
    try {
      localStorage.setItem('layout_recipe_detail_mode', 'grid');
      localStorage.setItem('layout_recipe_detail_board', JSON.stringify(this.boardCols));
      localStorage.setItem('layout_recipe_detail_board_widths', JSON.stringify(this.normalizePercents(this.boardWidths)));
      if (this.layout.recipeDetailColumns)
        localStorage.setItem('layout_recipe_detail_columns', String(this.layout.recipeDetailColumns));
    } catch {}
  }

  private savePartial(body: any) {
    this.saving = true;
    this.success = '';
    this.error = '';
    this.auth.updateCurrentUserJson(body).subscribe({
      next: () => {
        this.saving = false;
        this.success = this.i18n.t('status.saved');
      },
      error: () => {
        this.saving = false;
        this.error = this.i18n.t('status.failedSave');
      }
    });
  }

  // Drag & drop handlers
  dropActive(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.layoutActive, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  dropAvailable(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(this.layoutAvailable, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  // Board (3-column) handlers
  dropBoard(event: CdkDragDrop<string[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const item = event.previousContainer.data[event.previousIndex];
      // First transfer to keep indexes consistent
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      // Then ensure uniqueness across other columns and available list
      for (const col of this.boardCols) {
        if (col === event.container.data) continue;
        const idx = col.indexOf(item);
        if (idx !== -1) col.splice(idx, 1);
      }
      const availIdx = this.boardAvailable.indexOf(item);
      if (availIdx !== -1) this.boardAvailable.splice(availIdx, 1);
    }
    this.enforceRequiredInBoard();
  }

  computeMissingRequired(): string[] {
    const present = new Set<string>(this.boardCols.flat());
    return this.REQUIRED_BLOCKS.filter(b => !present.has(b));
  }

  isLayoutValid(): boolean {
    return this.computeMissingRequired().length === 0;
  }

  // Helpers for template bindings
  boardGridTemplate(): string {
    const n = Math.max(1, Math.min(3, (this.layout?.recipeDetailColumns as number) || 3));
    const widths = this.normalizePercents(this.boardWidths).slice(0, n);
    while (widths.length < n) widths.push(Math.floor(100 / n));
    // Use fr ratios in CSS to avoid overflow caused by gaps; still driven by percent inputs
    return widths.map(w => `minmax(0, ${w}fr)`).join(' ');
  }

  colIndices(): number[] {
    const n = Math.max(1, Math.min(3, (this.layout?.recipeDetailColumns as number) || 3));
    return Array.from({ length: n }, (_, i) => i);
  }

  connectedToAll(): string[] {
    const ids = ['availableList'];
    const n = Math.max(1, Math.min(3, (this.layout?.recipeDetailColumns as number) || 3));
    for (let i = 0; i < n; i++) ids.push(`colList-${i}`);
    return ids;
  }

  // Flex helpers for builder
  colPercent(i: number): number {
    const n = Math.max(1, Math.min(3, (this.layout?.recipeDetailColumns as number) || 3));
    const arr = this.normalizePercents(this.boardWidths).slice(0, n);
    return arr[i] ?? Math.floor(100 / n);
  }
  colFlex(i: number): string { return `0 0 ${this.colPercent(i)}%`; }

  // Ensure board has exactly N columns; move overflow items to the first column
  syncColumnsCount(n: 1|2|3) {
    const current = this.boardCols.length as 1|2|3;
    if (n < current) {
      const overflow = this.boardCols.slice(n).flat();
      this.boardCols = this.boardCols.slice(0, n);
      if (overflow.length) this.boardCols[0].push(...overflow);
    } else if (n > current) {
      while (this.boardCols.length < n) this.boardCols.push([]);
    }
    while (this.boardWidths.length < n) this.boardWidths.push(1);
    if (this.boardWidths.length > n) this.boardWidths = this.boardWidths.slice(0, n);
  }

  onColumnsChange(n: 1|2|3) {
    this.layout.recipeDetailColumns = n;
    this.syncColumnsCount(n);
    this.ensureDefaultPercents(n);
    this.recomputeAvailable();
    this.enforceRequiredInBoard();
  }

  recomputeAvailable() {
    const used = new Set(this.boardCols.flat());
    // All possible blocks excluding comments (fixed at bottom)
    const all = new Set<string>([...this.DEFAULT_RECIPE_DETAIL, ...this.layoutAvailable]);
    // Ensure core blocks are represented even if DEFAULT changes
    ['image','title','description','meta','ingredients','steps','tags','author','nutrition']
      .forEach(k => all.add(k));
    this.boardAvailable = [...[...all].filter(x => !used.has(x))];
  }

  // width helpers
  normalizePercents(arr: number[]): number[] {
    const a = (arr || []).map(v => Math.max(0, Math.min(100, Math.round(v))));
    if (!a.length) return [100];
    // Auto-convert from legacy 'fr' values (small integers)
    const max = Math.max(...a);
    const sum = a.reduce((s, v) => s + v, 0);
    if (max <= 4 && sum <= 12) {
      const s = sum || 1;
      return a.map((v, i) => i === a.length - 1 ? 100 - Math.round((a.slice(0, -1).reduce((s2, v2) => s2 + Math.round((v2 / s) * 100), 0))) : Math.round((v / s) * 100));
    }
    // Normalize last column to make ~100
    const n = a.length;
    const totalFirst = a.slice(0, n - 1).reduce((s, v) => s + v, 0);
    a[n - 1] = Math.max(0, 100 - totalFirst);
    return a;
  }

  ensureDefaultPercents(n: number) {
    if (n === 1) this.boardWidths = [100];
    if (n === 2 && this.boardWidths.length < 2) this.boardWidths = [66, 34];
    if (n === 3 && this.boardWidths.length < 3) this.boardWidths = [33, 34, 33];
    this.boardWidths = this.normalizePercents(this.boardWidths).slice(0, n as number);
  }

  onPercentChange(i: number, v: number) {
    const n = Math.max(1, Math.min(3, (this.layout.recipeDetailColumns as number) || 3));
    const val = Math.max(0, Math.min(100, Math.round(v)));
    if (i < 0 || i >= n) return;
    this.boardWidths[i] = val;
    this.boardWidths = this.normalizePercents(this.boardWidths).slice(0, n);
  }

  private enforceRequiredInBoard() {
    const present = new Set(this.boardCols.flat());
    for (const req of this.REQUIRED_BLOCKS) {
      if (!present.has(req)) {
        // add to first column
        if (!this.boardCols.length) this.boardCols = [[]];
        this.boardCols[0].push(req);
      }
    }
    this.recomputeAvailable();
  }

  resetLayout() {
    this.layoutActive = [...this.DEFAULT_RECIPE_DETAIL];
    this.layoutAvailable = ['tags','author','nutrition'];
    this.layout.recipeDetailColumns = 3;
    this.boardWidths = [1,1,1];
    this.boardCols = [
      ['image','title','description'],
      ['meta','tags','author'],
      ['ingredients','steps']
    ];
    this.recomputeAvailable();
  }
}
