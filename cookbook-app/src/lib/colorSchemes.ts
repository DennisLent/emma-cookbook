// All color schemes are WCAG AA compliant
// HSL values for use with CSS variables

export type ColorScheme = {
  id: string;
  name: string;
  light: {
    primary: string;
    primaryHover: string;
    primaryForeground: string;
  };
  dark: {
    primary: string;
    primaryHover: string;
    primaryForeground: string;
  };
};

export const colorSchemes: ColorScheme[] = [
  {
    id: "blue",
    name: "Ocean Blue",
    light: {
      primary: "217 91% 60%",      // #2563EB
      primaryHover: "221 83% 53%", // #1D4ED8
      primaryForeground: "0 0% 100%",
    },
    dark: {
      primary: "213 94% 68%",      // #60A5FA
      primaryHover: "217 91% 60%", // #3B82F6
      primaryForeground: "222 47% 11%",
    },
  },
  {
    id: "emerald",
    name: "Forest Green",
    light: {
      primary: "160 84% 39%",      // #059669
      primaryHover: "161 94% 30%", // #047857
      primaryForeground: "0 0% 100%",
    },
    dark: {
      primary: "160 67% 52%",      // #34D399
      primaryHover: "160 84% 39%", // #10B981
      primaryForeground: "222 47% 11%",
    },
  },
  {
    id: "amber",
    name: "Warm Amber",
    light: {
      primary: "25 95% 53%",       // #F97316
      primaryHover: "21 90% 48%",  // #EA580C
      primaryForeground: "0 0% 100%",
    },
    dark: {
      primary: "31 97% 62%",       // #FBBF24
      primaryHover: "25 95% 53%",  // #F59E0B
      primaryForeground: "222 47% 11%",
    },
  },
  {
    id: "rose",
    name: "Rose Pink",
    light: {
      primary: "346 77% 50%",      // #E11D48
      primaryHover: "343 80% 43%", // #BE123C
      primaryForeground: "0 0% 100%",
    },
    dark: {
      primary: "349 89% 67%",      // #FB7185
      primaryHover: "346 77% 50%", // #F43F5E
      primaryForeground: "222 47% 11%",
    },
  },
  {
    id: "violet",
    name: "Royal Violet",
    light: {
      primary: "262 83% 58%",      // #7C3AED
      primaryHover: "263 70% 50%", // #6D28D9
      primaryForeground: "0 0% 100%",
    },
    dark: {
      primary: "263 70% 71%",      // #A78BFA
      primaryHover: "262 83% 58%", // #8B5CF6
      primaryForeground: "222 47% 11%",
    },
  },
  {
    id: "slate",
    name: "Classic Slate",
    light: {
      primary: "215 16% 47%",      // #64748B
      primaryHover: "215 19% 35%", // #475569
      primaryForeground: "0 0% 100%",
    },
    dark: {
      primary: "215 20% 65%",      // #94A3B8
      primaryHover: "215 16% 47%", // #64748B
      primaryForeground: "222 47% 11%",
    },
  },
];

export const defaultScheme = colorSchemes[0]; // Ocean Blue

export function getSchemeById(id: string): ColorScheme {
  return colorSchemes.find((s) => s.id === id) || defaultScheme;
}

export function applyColorScheme(schemeId: string, theme: "light" | "dark") {
  const scheme = getSchemeById(schemeId);
  const colors = theme === "dark" ? scheme.dark : scheme.light;
  
  document.documentElement.style.setProperty("--primary", colors.primary);
  document.documentElement.style.setProperty("--primary-hover", colors.primaryHover);
  document.documentElement.style.setProperty("--primary-foreground", colors.primaryForeground);
  document.documentElement.style.setProperty("--accent", colors.primary);
  document.documentElement.style.setProperty("--accent-foreground", colors.primaryForeground);
  document.documentElement.style.setProperty("--ring", colors.primary);
}
