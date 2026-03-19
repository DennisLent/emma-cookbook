import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Settings = {
  siteTitle: string;
  accentColor: string;
  theme: "light" | "dark";
};

type SettingsContextType = {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = "cookbook-settings";
const DEFAULT_SETTINGS: Settings = {
  siteTitle: "Cookbook",
  accentColor: "#2563EB",
  theme: "light",
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
