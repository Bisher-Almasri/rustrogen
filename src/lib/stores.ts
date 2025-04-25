import { get, writable } from 'svelte/store';

// Create a store for settings that can be shared across components
export const settings = writable({
  theme: "dark",
  fontSize: 14,
  fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
  wordWrap: true,
  autoSave: true,
  tabSize: 2,
  simpleTabStyle: false,
});

// Helper function to save settings to localStorage
export function saveSettings() {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("rustrogen-settings", JSON.stringify(get(settings)));
  }
}

// Helper function to load settings from localStorage
export function loadSettings() {
  if (typeof localStorage !== "undefined") {
    const savedSettings = localStorage.getItem("rustrogen-settings");
    if (savedSettings) {
      settings.set(JSON.parse(savedSettings));
    }
  }
}

// Helper function to apply theme
export function applyTheme(themeId: any) {
  const root = document.documentElement;

  switch (themeId) {
    case "darker":
      root.style.setProperty("--bg-primary", "#0a0a0a");
      root.style.setProperty("--bg-secondary", "#151515");
      root.style.setProperty("--bg-tertiary", "#1c1c1c");
      root.style.setProperty("--accent-primary", "#8b5cf6");
      root.style.setProperty("--accent-secondary", "#7c3aed");
      root.style.setProperty("--accent-tertiary", "#bb86fc");
      root.style.setProperty("--text-primary", "#e0e0e0");
      root.style.setProperty("--text-secondary", "#a6afbd");
      root.style.setProperty("--text-muted", "#666666");
      break;
    case "light":
      root.style.setProperty("--bg-primary", "#f5f5f5");
      root.style.setProperty("--bg-secondary", "#e5e5e5");
      root.style.setProperty("--bg-tertiary", "#d5d5d5");
      root.style.setProperty("--text-primary", "#333333");
      root.style.setProperty("--text-secondary", "#555555");
      root.style.setProperty("--text-muted", "#888888");
      root.style.setProperty("--accent-primary", "#8b5cf6");
      root.style.setProperty("--accent-secondary", "#7c3aed");
      root.style.setProperty("--accent-tertiary", "#9333ea");
      root.style.setProperty("--border", "#cccccc");
      break;
    case "purple":
      root.style.setProperty("--bg-primary", "#13111C");
      root.style.setProperty("--bg-secondary", "#1E1B2C");
      root.style.setProperty("--bg-tertiary", "#2A2640");
      root.style.setProperty("--accent-primary", "#A78BFA");
      root.style.setProperty("--accent-secondary", "#8B5CF6");
      root.style.setProperty("--accent-tertiary", "#C4B5FD");
      root.style.setProperty("--text-primary", "#e0e0e0");
      root.style.setProperty("--text-secondary", "#a6afbd");
      root.style.setProperty("--text-muted", "#666666");
      break;
    case "blue":
      root.style.setProperty("--bg-primary", "#0F172A");
      root.style.setProperty("--bg-secondary", "#1E293B");
      root.style.setProperty("--bg-tertiary", "#334155");
      root.style.setProperty("--accent-primary", "#3B82F6");
      root.style.setProperty("--accent-secondary", "#2563EB");
      root.style.setProperty("--accent-tertiary", "#60A5FA");
      root.style.setProperty("--text-primary", "#e0e0e0");
      root.style.setProperty("--text-secondary", "#a6afbd");
      root.style.setProperty("--text-muted", "#666666");
      break;
    default:
      root.style.setProperty("--bg-primary", "#121212");
      root.style.setProperty("--bg-secondary", "#1e1e1e");
      root.style.setProperty("--bg-tertiary", "#252525");
      root.style.setProperty("--accent-primary", "#8b5cf6");
      root.style.setProperty("--accent-secondary", "#7c3aed");
      root.style.setProperty("--accent-tertiary", "#bb86fc");
      root.style.setProperty("--text-primary", "#e0e0e0");
      root.style.setProperty("--text-secondary", "#a6afbd");
      root.style.setProperty("--text-muted", "#666666");
      break;
  }
}