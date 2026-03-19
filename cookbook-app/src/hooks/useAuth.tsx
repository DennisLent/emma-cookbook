import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { applyColorScheme, defaultScheme } from "@/lib/colorSchemes";
import { apiRequest, clearTokens, setTokens } from "@/lib/api";

type UserPrefs = {
  theme: "light" | "dark";
  colorScheme: string;
  density: "cozy" | "compact";
  cookFontSize: "normal" | "large" | "x-large";
  highContrast: boolean;
  reduceMotion: boolean;
};

type User = {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  prefs: UserPrefs;
  favoriteRecipeIds?: string[];
};

type AuthContextType = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string, name: string, email?: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<User>, avatarFile?: File) => Promise<User>;
  isAuthenticated: boolean;
};

type BackendUser = {
  id: string;
  username: string;
  email?: string;
  name?: string;
  display_name?: string;
  avatarUrl?: string | null;
  prefs?: Partial<UserPrefs>;
  favorite_recipe_ids?: string[];
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const STORAGE_KEY = "cookbook-auth-user";

const DEFAULT_PREFS: UserPrefs = {
  theme: "light",
  colorScheme: defaultScheme.id,
  density: "cozy",
  cookFontSize: "normal",
  highContrast: false,
  reduceMotion: false,
};

function normalizeUser(data: BackendUser): User {
  return {
    id: String(data.id),
    username: data.username,
    name: data.name || data.display_name || data.username,
    email: data.email,
    avatarUrl: data.avatarUrl || undefined,
    favoriteRecipeIds: (data.favorite_recipe_ids || []).map((id) => String(id)),
    prefs: {
      ...DEFAULT_PREFS,
      ...(data.prefs || {}),
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });

  useEffect(() => {
    if (!user) {
      document.documentElement.setAttribute("data-theme", "light");
      applyColorScheme(defaultScheme.id, "light");
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    document.documentElement.setAttribute("data-theme", user.prefs.theme);
    applyColorScheme(user.prefs.colorScheme, user.prefs.theme);
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const profile = await apiRequest<BackendUser>("/users/me/");
        if (!cancelled) {
          setUser(normalizeUser(profile));
        }
      } catch {
        if (!cancelled) {
          clearTokens();
          setUser(null);
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const tokenData = await apiRequest<{ access: string; refresh: string }>("/auth/token/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setTokens(tokenData.access, tokenData.refresh);
      const profile = await apiRequest<BackendUser>("/users/me/");
      setUser(normalizeUser(profile));
      return true;
    } catch {
      return false;
    }
  };

  const signup = async (username: string, password: string, name: string, email?: string): Promise<boolean> => {
    try {
      await apiRequest("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
          password2: password,
          name,
          email,
          preferences: { prefs: DEFAULT_PREFS },
        }),
      });
      return login(username, password);
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>, avatarFile?: File): Promise<User> => {
    if (!user) {
      throw new Error("You must be logged in to update your profile.");
    }

    let profile: BackendUser;
    if (avatarFile) {
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      profile = await apiRequest<BackendUser>("/users/me/", {
        method: "PATCH",
        body: formData,
      });
    } else {
      const payload: Record<string, unknown> = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.favoriteRecipeIds !== undefined) payload.favorite_recipe_ids = updates.favoriteRecipeIds;
      if (updates.prefs !== undefined) payload.preferences = { prefs: updates.prefs };

      profile = await apiRequest<BackendUser>("/users/me/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    }

    const normalized = normalizeUser(profile);
    setUser(normalized);
    return normalized;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        updateProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
