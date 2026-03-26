import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiDownload, apiRequest, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type OllamaModel = {
  name: string;
  size?: number | null;
  modifiedAt?: string | null;
  family?: string;
  parameterSize?: string;
  quantizationLevel?: string;
  isActive: boolean;
};

type ExtractionSettings = {
  ollamaModel: string;
  voskModelPath: string;
  ollamaModelOptions: string[];
  installedOllamaModels: OllamaModel[];
  voskModelPathOptions: string[];
};

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voskFileInputRef = useRef<HTMLInputElement>(null);
  const [extractionSettings, setExtractionSettings] = useState<ExtractionSettings | null>(null);
  const [ollamaModel, setOllamaModel] = useState("");
  const [voskModelPath, setVoskModelPath] = useState("");
  const [newOllamaModel, setNewOllamaModel] = useState("");
  const [isSavingModels, setIsSavingModels] = useState(false);
  const [isPullingModel, setIsPullingModel] = useState(false);
  const [isUploadingVoskModel, setIsUploadingVoskModel] = useState(false);
  const [busyModelName, setBusyModelName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isSuperuser) {
      return;
    }

    apiRequest<ExtractionSettings>("/settings/extraction-models/")
      .then((data) => {
        setExtractionSettings(data);
        setOllamaModel(data.ollamaModel);
        setVoskModelPath(data.voskModelPath);
      })
      .catch(() => undefined);
  }, [user?.isSuperuser]);

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

  const handleSaveExtractionSettings = async () => {
    setIsSavingModels(true);
    try {
      const saved = await apiRequest<ExtractionSettings>("/settings/extraction-models/", {
        method: "PATCH",
        body: JSON.stringify({
          ollamaModel,
          voskModelPath,
        }),
      });
      setExtractionSettings(saved);
      setOllamaModel(saved.ollamaModel);
      setVoskModelPath(saved.voskModelPath);
      toast({ title: "Extraction models updated" });
    } catch (error) {
      toast({
        title: "Failed to update extraction models",
        description: getApiErrorMessage(error, "The extraction model settings could not be saved."),
        variant: "destructive",
      });
    } finally {
      setIsSavingModels(false);
    }
  };

  const handlePullOllamaModel = async () => {
    if (!newOllamaModel.trim()) {
      toast({ title: "Model name is required", variant: "destructive" });
      return;
    }

    setIsPullingModel(true);
    try {
      const saved = await apiRequest<ExtractionSettings>("/settings/extraction-models/", {
        method: "POST",
        body: JSON.stringify({ model: newOllamaModel.trim() }),
      });
      setExtractionSettings(saved);
      setNewOllamaModel("");
      toast({ title: "Ollama model pulled" });
    } catch (error) {
      toast({
        title: "Failed to pull Ollama model",
        description: getApiErrorMessage(error, "The model could not be pulled from Ollama."),
        variant: "destructive",
      });
    } finally {
      setIsPullingModel(false);
    }
  };

  const handleActivateOllamaModel = async (modelName: string) => {
    setBusyModelName(modelName);
    try {
      const saved = await apiRequest<ExtractionSettings>("/settings/extraction-models/", {
        method: "PATCH",
        body: JSON.stringify({
          ollamaModel: modelName,
          voskModelPath,
        }),
      });
      setExtractionSettings(saved);
      setOllamaModel(saved.ollamaModel);
      setVoskModelPath(saved.voskModelPath);
      toast({ title: `Active model set to ${modelName}` });
    } catch (error) {
      toast({
        title: "Failed to change active model",
        description: getApiErrorMessage(error, "The active Ollama model could not be updated."),
        variant: "destructive",
      });
    } finally {
      setBusyModelName(null);
    }
  };

  const handleDeleteOllamaModel = async (modelName: string) => {
    setBusyModelName(modelName);
    try {
      const saved = await apiRequest<ExtractionSettings>(`/settings/extraction-models/?model=${encodeURIComponent(modelName)}`, {
        method: "DELETE",
      });
      setExtractionSettings(saved);
      toast({ title: `Deleted ${modelName}` });
    } catch (error) {
      toast({
        title: "Failed to delete Ollama model",
        description: getApiErrorMessage(error, "The Ollama model could not be deleted."),
        variant: "destructive",
      });
    } finally {
      setBusyModelName(null);
    }
  };

  const handleUploadVoskModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVoskModel(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const saved = await apiRequest<ExtractionSettings>("/settings/vosk-model-upload/", {
        method: "POST",
        body: formData,
      });
      setExtractionSettings(saved);
      setVoskModelPath(saved.voskModelPath);
      toast({ title: "Vosk model replaced" });
    } catch (error) {
      toast({
        title: "Failed to upload Vosk model",
        description: getApiErrorMessage(error, "The Vosk model archive could not be uploaded."),
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
      setIsUploadingVoskModel(false);
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
        {user?.isSuperuser && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Extraction Models</h2>

            <div className="space-y-2">
              <Label htmlFor="newOllamaModel">Add Ollama Model</Label>
              <div className="flex gap-2">
                <Input
                  id="newOllamaModel"
                  value={newOllamaModel}
                  onChange={(e) => setNewOllamaModel(e.target.value)}
                  placeholder="e.g. llama3.2:latest"
                />
                <Button onClick={() => void handlePullOllamaModel()} disabled={isPullingModel}>
                  Pull Model
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Pull a model into Ollama, then activate it below.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Installed Ollama Models</Label>
              {(extractionSettings?.installedOllamaModels || []).length > 0 ? (
                <div className="space-y-3">
                  {extractionSettings?.installedOllamaModels.map((model) => (
                    <div key={model.name} className="rounded-lg border p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{model.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {[model.family, model.parameterSize, model.quantizationLevel, formatBytes(model.size)].filter(Boolean).join(" • ") || "No extra metadata"}
                          </p>
                        </div>
                        {model.isActive && (
                          <span className="text-xs font-medium uppercase tracking-wide text-primary">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={model.isActive ? "secondary" : "default"}
                          disabled={model.isActive || busyModelName === model.name}
                          onClick={() => void handleActivateOllamaModel(model.name)}
                        >
                          Use This Model
                        </Button>
                        <Button
                          variant="outline"
                          disabled={model.isActive || busyModelName === model.name}
                          onClick={() => void handleDeleteOllamaModel(model.name)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No installed Ollama models were discovered yet.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="voskModelPath">Vosk Model Path</Label>
              <Input
                id="voskModelPath"
                list="vosk-model-path-options"
                value={voskModelPath}
                onChange={(e) => setVoskModelPath(e.target.value)}
                placeholder="/app/vosk-model"
              />
              <datalist id="vosk-model-path-options">
                {(extractionSettings?.voskModelPathOptions || []).map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Replace Vosk Model</Label>
              <input
                ref={voskFileInputRef}
                type="file"
                accept=".zip,application/zip"
                onChange={handleUploadVoskModel}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => voskFileInputRef.current?.click()}
                disabled={isUploadingVoskModel}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Vosk ZIP
              </Button>
              <p className="text-sm text-muted-foreground">
                Upload a zip archive for a replacement Vosk model. The current model directory on the server will be overwritten.
              </p>
            </div>

            <Button onClick={() => void handleSaveExtractionSettings()} disabled={isSavingModels}>
              Save Vosk Setting
            </Button>

            <p className="text-sm text-muted-foreground">
              These settings affect future recipe imports only and are only available to the Django superuser.
            </p>
          </section>
        )}

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
