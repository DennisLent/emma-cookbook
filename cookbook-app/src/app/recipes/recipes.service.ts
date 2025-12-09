import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Recipe, Tag, Ingredient } from './recipes.model';

export interface PaginatedRecipes {
  count: number;
  next: string | null;
  previous: string | null;
  results: Recipe[];
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private baseUrl = `${environment.apiUrl}/recipes`;

  constructor(private http: HttpClient) {}

  getAllRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.baseUrl + '/');
  }

  getRecipesPage(page: number, opts?: { sort?: 'rating' | 'favorites'; direction?: 'asc' | 'desc' }): Observable<PaginatedRecipes> {
    const params: string[] = [`page=${page}`];
    if (opts?.sort) params.push(`sort=${opts.sort}`);
    if (opts?.direction) params.push(`direction=${opts.direction}`);
    const qs = params.join('&');
    return this.http.get<PaginatedRecipes>(`${this.baseUrl}/?${qs}`);
  }

  getById(id: number): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.baseUrl}/${id}/`);
  }

  getAllTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${environment.apiUrl}/tags/`);
  }

  getAllIngredients(): Observable<Tag[]> {
    return this.http.get<Ingredient[]>(`${environment.apiUrl}/ingredients/`);
  }

  getCarouselSuggestions(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.baseUrl + '/suggestions/')
  }

  previewFromWebsite(url: string): Observable<Recipe> {
    return this.http.post<Recipe>(`${this.baseUrl}/preview/website/`, { url });
  }

  previewFromYoutube(video_url: string): Observable<Recipe> {
    return this.http.post<Recipe>(`${this.baseUrl}/preview/youtube/`, { video_url });
  }

  generatePlan(dietType: string, days: number, mealsPerDay: number): Observable<{ plan: Recipe[][] }> {
    return this.http.post<{ plan: Recipe[][] }>(`${this.baseUrl}/plan/`, {
      diet_type: dietType,
      days,
      meals_per_day: mealsPerDay
    });
  }

  swapRecipeInPlan(dietType: string, currentRecipeId: number, existingPlanIds: number[]): Observable<Recipe> {
    return this.http.post<Recipe>(`${this.baseUrl}/swap/`, {
      diet_type: dietType,
      current_recipe_id: currentRecipeId,
      existing_plan_ids: existingPlanIds
    });
  }

  createRecipe(formData: FormData): Observable<Recipe> {
    return this.http.post<Recipe>(`${this.baseUrl}/`, formData);
  }

  // Favorites
  favoriteRecipe(id: number): Observable<{ is_favorited: boolean; favorites_count: number }> {
    return this.http.post<{ is_favorited: boolean; favorites_count: number }>(`${this.baseUrl}/${id}/favorite/`, {});
    }

  unfavoriteRecipe(id: number): Observable<{ is_favorited: boolean; favorites_count: number }> {
    return this.http.delete<{ is_favorited: boolean; favorites_count: number }>(`${this.baseUrl}/${id}/favorite/`);
  }

  // Ratings
  rateRecipe(id: number, stars: number): Observable<{ my_rating: number; avg_rating: number | null }> {
    return this.http.post<{ my_rating: number; avg_rating: number | null }>(`${this.baseUrl}/${id}/rate/`, { stars });
  }

  // Update existing recipe
  updateRecipe(id: number, body: any): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.baseUrl}/${id}/`, body);
  }

  // Tags
  createTag(name: string): Observable<Tag> {
    return this.http.post<Tag>(`${environment.apiUrl}/tags/`, { name });
  }

  // Comments
  addComment(recipeId: number, text: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/comments/`, { recipe: recipeId, text });
  }
}
