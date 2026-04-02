// Shared star rating display/input used across cards and detail views.

 import { Star } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface StarRatingProps {
   rating: number;
   maxRating?: number;
   size?: "sm" | "md" | "lg";
   interactive?: boolean;
   onRate?: (rating: number) => void;
   showCount?: boolean;
   count?: number;
 }
 
 export const StarRating = ({
   rating,
   maxRating = 5,
   size = "md",
   interactive = false,
   onRate,
   showCount = false,
   count = 0
 }: StarRatingProps) => {
   const sizeClasses = {
     sm: "w-3 h-3",
     md: "w-4 h-4",
     lg: "w-5 h-5"
   };
 
   const handleClick = (starIndex: number) => {
     if (interactive && onRate) {
       onRate(starIndex + 1);
     }
   };
 
   return (
     <div className="flex items-center gap-1">
       <div className="flex">
         {Array.from({ length: maxRating }).map((_, index) => {
           const filled = index < Math.floor(rating);
           const partial = index === Math.floor(rating) && rating % 1 > 0;
           
           return (
             <button
               key={index}
               type="button"
               disabled={!interactive}
               onClick={() => handleClick(index)}
               className={cn(
                 "transition-colors",
                 interactive && "cursor-pointer hover:scale-110",
                 !interactive && "cursor-default"
               )}
             >
               <Star
                 className={cn(
                   sizeClasses[size],
                 filled || partial ? "text-primary fill-primary" : "text-muted-foreground/30"
                 )}
               />
             </button>
           );
         })}
       </div>
       {showCount && count > 0 && (
         <span className="text-xs text-muted-foreground">
           ({count})
         </span>
       )}
     </div>
   );
 };
