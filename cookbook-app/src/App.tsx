// Root application shell that wires together providers, notifications, and routes.

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RecipesProvider } from "@/hooks/useRecipes";
import { SettingsProvider } from "@/hooks/useSettings";
import { AuthProvider } from "@/hooks/useAuth";
import { SocialProvider } from "@/hooks/useSocial";
import { CollectionsProvider } from "@/hooks/useCollections";
import { UpdateNotifier } from "@/components/UpdateNotifier";
import Index from "./pages/Index";
import AddRecipe from "./pages/AddRecipe";
import EditRecipe from "./pages/EditRecipe";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
 import Profile from "./pages/Profile";
 import MealPlan from "./pages/MealPlan";
import IngredientMatch from "./pages/IngredientMatch";
import RecipePage from "./pages/RecipePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SettingsProvider>
        <RecipesProvider>
           <SocialProvider>
            <CollectionsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <UpdateNotifier />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/add" element={<AddRecipe />} />
                <Route path="/edit/:id" element={<EditRecipe />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/login" element={<Login />} />
                 <Route path="/profile" element={<Profile />} />
                 <Route path="/meal-plan" element={<MealPlan />} />
                 <Route path="/match" element={<IngredientMatch />} />
                <Route path="/recipes/:id" element={<RecipePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
            </CollectionsProvider>
           </SocialProvider>
        </RecipesProvider>
      </SettingsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
