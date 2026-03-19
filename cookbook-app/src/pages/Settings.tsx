import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecipes } from "@/hooks/useRecipes";
import { toast } from "@/hooks/use-toast";
import { Recipe } from "@/types/recipe";

export default function Settings() {
  const navigate = useNavigate();
  const { exportRecipes, importRecipes } = useRecipes();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportRecipes();
    toast({ title: "Recipes exported" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as Recipe[];
        if (Array.isArray(data)) {
          importRecipes(data);
          toast({ title: "Recipes imported successfully" });
        } else {
          toast({ title: "Invalid file format", variant: "destructive" });
        }
      } catch {
        toast({ title: "Failed to import recipes", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card sticky top-0 z-40 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Backup & Restore</h2>
          
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={handleExport} className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export Recipes (JSON)
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="justify-start"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Recipes (JSON)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Export your recipes to back them up, or import recipes from a JSON file.
          </p>
        </section>
      </main>
    </div>
  );
}
