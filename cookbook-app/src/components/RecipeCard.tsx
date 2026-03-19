 import { Recipe } from "@/types/recipe";
 import { Clock, Users, Heart } from "lucide-react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { StarRating } from "@/components/StarRating";
 import { useSocial } from "@/hooks/useSocial";
 import { useAuth } from "@/hooks/useAuth";
 import { cn } from "@/lib/utils";
 import { toast } from "@/hooks/use-toast";
 import { getApiErrorMessage } from "@/lib/api";
 
 interface RecipeCardProps {
   recipe: Recipe;
   onClick: () => void;
 }
 
 export const RecipeCard = ({ recipe, onClick }: RecipeCardProps) => {
   const totalTime = (recipe.prepMin || 0) + (recipe.cookMin || 0);
   const { getAverageRating, isFavorite, toggleFavorite } = useSocial();
   const { isAuthenticated } = useAuth();
   const { average, count } = getAverageRating(recipe.id);
   const favorite = isFavorite(recipe.id);
 
   const handleFavoriteClick = async (e: React.MouseEvent) => {
     e.stopPropagation();
     try {
       await toggleFavorite(recipe.id);
     } catch (error) {
       toast({
         title: "Failed to update favorite",
         description: getApiErrorMessage(error, "The favorite status could not be updated."),
         variant: "destructive",
       });
     }
   };
 
   return (
     <Card
       className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 group"
       onClick={onClick}
     >
       <div className="aspect-video overflow-hidden bg-muted relative">
         {isAuthenticated && (
           <button
             onClick={handleFavoriteClick}
             className="absolute top-2 right-2 z-10 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
           >
             <Heart
               className={cn(
                 "w-5 h-5 transition-colors",
                 favorite ? "fill-destructive text-destructive" : "text-muted-foreground"
               )}
             />
           </button>
         )}
         {recipe.imageUrl ? (
           <img
             src={recipe.imageUrl}
             alt={recipe.title}
             className="w-full h-full object-cover transition-transform group-hover:scale-105"
           />
         ) : (
           <div className="w-full h-full flex items-center justify-center text-muted-foreground">
             No image
           </div>
         )}
       </div>
       <CardContent className="p-4 space-y-3">
         <h3 className="font-semibold text-lg line-clamp-2">{recipe.title}</h3>
 
         {recipe.description && (
           <p className="text-sm text-muted-foreground line-clamp-2">
             {recipe.description}
           </p>
         )}
 
         {count > 0 && (
           <StarRating rating={average} size="sm" showCount count={count} />
         )}
 
         <div className="flex items-center gap-4 text-sm text-muted-foreground">
           {totalTime > 0 && (
             <div className="flex items-center gap-1">
               <Clock className="w-4 h-4" />
               <span>{totalTime} min</span>
             </div>
           )}
           <div className="flex items-center gap-1">
             <Users className="w-4 h-4" />
             <span>{recipe.servings} servings</span>
           </div>
         </div>
 
         {recipe.tags.length > 0 && (
           <div className="flex flex-wrap gap-2">
             {recipe.tags.slice(0, 3).map((tag) => (
               <Badge key={tag} variant="secondary" className="text-xs">
                 {tag}
               </Badge>
             ))}
           </div>
         )}
       </CardContent>
     </Card>
   );
 };
