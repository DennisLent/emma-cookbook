import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiDownload, apiRequest, getApiErrorMessage } from "@/lib/api";

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const blob = await apiDownload("/database/export/");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cookbook-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Database backup exported" });
    } catch (error) {
      toast({
        title: "Failed to export backup",
        description: getApiErrorMessage(error, "The database backup could not be exported."),
        variant: "destructive",
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiRequest("/database/import/", {
        method: "POST",
        body: formData,
      });
      toast({ title: "Database backup imported successfully" });
      window.location.reload();
    } catch (error) {
      toast({
        title: "Failed to import backup",
        description: getApiErrorMessage(error, "The database backup could not be imported."),
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
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
            <Button variant="outline" onClick={() => void handleExport()} className="justify-start">
              <Download className="w-4 h-4 mr-2" />
              Export Database Backup (JSON)
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
              Import Database Backup (JSON)
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Export or restore the backend app data as a JSON backup. This is intended for admin/local maintenance workflows.
          </p>
        </section>
      </main>
    </div>
  );
}
