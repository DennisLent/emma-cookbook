 export type Rating = {
   recipeId: string;
   userId: string;
   value: number; // 1-5 stars
   createdAt: string;
 };
 
 export type Comment = {
   id: string;
   recipeId: string;
   userId: string;
   userName: string;
   text: string;
   createdAt: string;
 };
 
 export type RecipeSocialData = {
   averageRating: number;
   ratingCount: number;
   userRating?: number;
   comments: Comment[];
   isFavorite: boolean;
 };