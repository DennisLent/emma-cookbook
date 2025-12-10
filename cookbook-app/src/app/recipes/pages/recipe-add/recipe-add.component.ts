// add-recipe.component.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators, FormsModule} from '@angular/forms';
import { RecipeService } from '../../recipes.service';
import { Ingredient, Tag, Recipe } from '../../recipes.model';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-recipe-add',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatButtonToggleModule,
    FormsModule
  ],
  templateUrl: './recipe-add.component.html',
  styleUrls: ['./recipe-add.component.scss']
})
export class AddRecipeComponent implements OnInit {
  // UI modes per design: Manual | Paste | From URL
  mode: 'manual' | 'paste' | 'url' = 'manual';
  allowImportModes = true;
  websiteUrl = '';
  isPreviewing = false;
  previewError = '';
  isEditing = false;
  recipeId?: number;

  tags: Tag[] = [];

  recipeForm!: FormGroup;
  pasteText = '';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private recipeService: RecipeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.recipeService.getAllTags().subscribe(t => (this.tags = t));

    this.recipeForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      instructions: ['', Validators.required],
      tags: [[]],
      servings: [null],
      prep_time: [''],
      cook_time: [''],
      total_time: [''],
      ingredients_data: this.fb.array([]),
      image: [null]
    });

    if (!this.ingredients.length) {
      this.addIngredient();
    }

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditing = true;
      this.allowImportModes = false;
      this.mode = 'manual';
      this.recipeId = Number(idParam);
      this.loadRecipe(this.recipeId);
    }
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients_data') as FormArray;
  }

  addIngredient() {
    this.ingredients.push(
      this.fb.group({
        ingredient: ['', Validators.required],
        amount: ['', Validators.required]
      })
    );
  }

  removeIngredient(i: number) {
    this.ingredients.removeAt(i);
  }

  onFileChange(evt: Event) {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (file) {
      this.recipeForm.get('image')?.setValue(file);
    }
  }


  // PREVIEW FUNCTIONS
  onPreviewWebsite() {
    this.previewError = '';
    this.isPreviewing = true;
    this.recipeService.previewFromWebsite(this.websiteUrl).subscribe({
      next: recipe => this.populateForm(recipe),
      error: e =>
        (this.previewError = e.error?.detail || 'Preview failed'),
      complete: () => (this.isPreviewing = false)
    });
  }

  // Paste mode helper: accept pasted text and place into instructions
  applyPasted(text: string) {
    const cleaned = (text || '').trim();
    if (cleaned) {
      this.recipeForm.get('instructions')?.setValue(cleaned);
    }
  }

  private parseTime(input: string): string {
    if (!input) return '';
    if (/^\d{2}:\d{2}:\d{2}$/.test(input.trim())) return input.trim();

    const hoursMatch = input.match(/(\d+)\s*h/);
    const minsMatch = input.match(/(\d+)\s*m/);
    const secsMatch = input.match(/(\d+)\s*s/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    const secs = secsMatch ? parseInt(secsMatch[1], 10) : 0;

    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private populateForm(recipe: any) {
    this.recipeForm.patchValue({
      title: recipe.title ?? '',
      description: recipe.description ?? '',
      instructions: recipe.instructions ?? '',
      tags: recipe.tags ?? []
    });

    this.setIngredients(recipe.ingredients_data || recipe.ingredients);
  }

  // SUBMIT
  onSubmit() {
    if (this.recipeForm.invalid) return;

    const v = this.recipeForm.value;

    const ingredients = v.ingredients_data
      .filter((i: any) => i.ingredient && i.amount)
      .map((ing: any) => ({
        ingredient: typeof ing.ingredient === 'string'
          ? ing.ingredient
          : ing.ingredient?.name ?? '',
        amount: ing.amount ?? ''
      }));

    const baseData: any = {
      title: v.title,
      description: v.description ?? '',
      instructions: v.instructions,
      tags: v.tags,
      servings: v.servings,
      prep_time: this.parseTime(v.prep_time),
      cook_time: this.parseTime(v.cook_time),
      total_time: this.parseTime(v.total_time),
      ingredients_data: ingredients
    };

    if (v.image) {
      const fd = new FormData();

      Object.entries(baseData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (key === 'ingredients_data') {
            value.forEach((val: any, idx: number) => {
              fd.append(`${key}[${idx}][ingredient]`, val.ingredient);
              fd.append(`${key}[${idx}][amount]`, val.amount);
            });
          } else {
            value.forEach((item: any, idx: number) => {
              fd.append(`${key}[${idx}]`, String(item));
            });
          }
        } else if (value !== null && value !== undefined) {
          fd.append(key, String(value));
        }
      });

      fd.append('image', v.image);

      const action$ = this.isEditing && this.recipeId
        ? this.recipeService.updateRecipe(this.recipeId, fd)
        : this.recipeService.createRecipe(fd);

      action$.subscribe({
        next: (recipe) => {
          alert(this.isEditing ? 'Recipe updated!' : 'Recipe created!');
          this.router.navigate(['/recipes', recipe.id]);
        },
        error: err => {
          console.error('[Recipe Save Error]', err);
          alert('Failed to save recipe: ' + (err.error?.detail || err.message));
        }
      });

    } else {

      const action$ = this.isEditing && this.recipeId
        ? this.recipeService.updateRecipe(this.recipeId, baseData)
        : this.recipeService.createRecipe(baseData);

      action$.subscribe({
        next: (recipe) => {
          alert(this.isEditing ? 'Recipe updated!' : 'Recipe created!');
          this.router.navigate(['/recipes', recipe.id]);
        },
        error: err => {
          console.error('[Recipe Create Error]', err);
          alert('Failed to save recipe: ' + (err.error?.detail || err.message));
        }
      });
    }
  }

  private loadRecipe(id: number) {
    this.recipeService.getById(id).subscribe({
      next: (recipe: Recipe) => this.populateFormFromRecipe(recipe),
      error: err => {
        console.error('Failed to load recipe', err);
        this.router.navigate(['/recipes', id]);
      }
    });
  }

  private populateFormFromRecipe(recipe: Recipe) {
    this.recipeForm.patchValue({
      title: recipe.title,
      description: recipe.description,
      instructions: recipe.instructions,
      tags: recipe.tags || [],
      servings: recipe.servings,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      total_time: recipe.total_time,
      image: null
    });

    this.setIngredients(recipe.ingredients || (recipe as any).ingredients_data);
  }

  private setIngredients(list: any) {
    this.ingredients.clear();
    if (Array.isArray(list)) {
      list.forEach((ing: any) => {
        const nameRaw = ing?.ingredient?.name ?? ing?.ingredient ?? ing?.ingredient_id ?? '';
        const amountRaw = ing?.amount ?? '';
        const name = nameRaw == null ? '' : String(nameRaw);
        const amount = amountRaw == null ? '' : String(amountRaw);
        this.ingredients.push(
          this.fb.group({
            ingredient: [name, Validators.required],
            amount: [amount, Validators.required]
          })
        );
      });
    }
    if (!this.ingredients.length) this.addIngredient();
  }

}
