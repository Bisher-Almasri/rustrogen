<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount, onDestroy, tick } from "svelte";
  import * as monaco from "monaco-editor";
  import { init as initLuauLanguage } from "../languages/init";
  import { fade, fly, slide } from "svelte/transition";
  import { quintOut, elasticOut } from "svelte/easing";
  import { listen } from "@tauri-apps/api/event";
  import { flip } from "svelte/animate";
  import { settings, loadSettings, saveSettings, applyTheme } from "../lib/stores";
  import { getCurrentWindow } from "@tauri-apps/api/window";
    import { goto } from "$app/navigation";
  let logs: string[] = [];
  let logInitialized = false;
  let consoleVisible = true;
  let settingsVisible = false;
  let menuVisible = false;

  let appWindow = getCurrentWindow();

  const themes = [
    { id: "dark", name: "Dark (Default)" },
    { id: "darker", name: "Darker" },
    { id: "light", name: "Light" },
    { id: "purple", name: "Purple Accent" },
    { id: "blue", name: "Blue Accent" },
  ];

  const fonts = [
    {
      id: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      name: "JetBrains Mono",
    },
    { id: "'Fira Code', monospace", name: "Fira Code" },
    { id: "Consolas, 'Courier New', monospace", name: "Consolas" },
    { id: "'Source Code Pro', monospace", name: "Source Code Pro" },
  ];

  interface Tab {
    id: number;
    name: string;
    code: string;
  }

  let editorContainer: HTMLDivElement;
  let isExecuting = false;
  let output = "";
  let editor: monaco.editor.IStandaloneCodeEditor;
  let showLastTabWarning = false;
  let warningTimeout: number | undefined = undefined;
  let editorReady = false;
  let activeTabTransitioning = false;

  let tabs: Tab[] = [
    { id: 1, name: "Script 1", code: `print("Hello from Tab 1!")` },
    {
      id: 2,
      name: "saved.lua",
      code: `-- Saved script content\nlocal x = 10\nprint(x * 2)`,
    },
  ];
  let activeTabIndex = 0;
  let nextTabId = 3;

  $: activeTab = tabs[activeTabIndex];
  $: code = activeTab ? activeTab.code : "";

  let typingText = "";
  let fullText = activeTab ? activeTab.code : "-- Welcome to Rustrogen";
  let typingIndex = 0;
  let typingInterval: number | undefined = undefined;

  $: if (editor && $settings) {
    editor.updateOptions({
      fontSize: $settings.fontSize,
      fontFamily: $settings.fontFamily,
      wordWrap: $settings.wordWrap ? "on" : "off",
      tabSize: $settings.tabSize,
    });

    applyTheme($settings.theme);
    updateMonacoTheme($settings.theme);
  }
  function updateMonacoTheme(themeId: string) {
    let monacoColors = {
      "editor.background": "#0F0F0F",
      "editorLineNumber.foreground": "#555555",
      "editorLineNumber.activeForeground": "#999999",
      "editor.lineHighlightBackground": "#101010",
      "editorIndentGuide.background": "#1a1a1a",
      "editorSuggestWidget.background": "#0f0f0f",
      "editorSuggestWidget.border": "#222222",
      "editorSuggestWidget.foreground": "#D5D5D5",
      "editorSuggestWidget.selectedBackground": "#252525",
      "editorSuggestWidget.highlightForeground": "#8b5cf6",
      "textCodeBlock.background": "#0f0f0f",
    };

    switch (themeId) {
      case "darker":
        monacoColors = {
          ...monacoColors,
          "editor.background": "#0a0a0a",
          "editor.lineHighlightBackground": "#0d0d0d",
          "editorIndentGuide.background": "#151515",
          "editorSuggestWidget.background": "#0a0a0a",
          "editorSuggestWidget.border": "#1c1c1c",
        };
        break;
      case "light":
        monacoColors = {
          "editor.background": "#f5f5f5",
          "editorLineNumber.foreground": "#888888",
          "editorLineNumber.activeForeground": "#555555",
          "editor.lineHighlightBackground": "#e8e8e8",
          "editorIndentGuide.background": "#d5d5d5",
          "editorSuggestWidget.background": "#f5f5f5",
          "editorSuggestWidget.border": "#cccccc",
          "editorSuggestWidget.foreground": "#333333",
          "editorSuggestWidget.selectedBackground": "#e0e0e0",
          "editorSuggestWidget.highlightForeground": "#8b5cf6",
          "textCodeBlock.background": "#e5e5e5",
        };
        break;
      case "purple":
        monacoColors = {
          ...monacoColors,
          "editor.background": "#13111C",
          "editor.lineHighlightBackground": "#1A1726",
          "editorIndentGuide.background": "#1E1B2C",
          "editorSuggestWidget.background": "#13111C",
          "editorSuggestWidget.border": "#2A2640",
          "editorSuggestWidget.highlightForeground": "#A78BFA",
        };
        break;
      case "blue":
        monacoColors = {
          ...monacoColors,
          "editor.background": "#0F172A",
          "editor.lineHighlightBackground": "#172033",
          "editorIndentGuide.background": "#1E293B",
          "editorSuggestWidget.background": "#0F172A",
          "editorSuggestWidget.border": "#334155",
          "editorSuggestWidget.highlightForeground": "#3B82F6",
        };
        break;
    }

    monaco.editor.defineTheme("rustrogen", {
    base: themeId === "light" ? "vs" : "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "#C3CCDB" },
      { token: "variable.language.self", foreground: "#F7768E" },
      { token: "variable.parameter.variadic", foreground: "#F7768E" },
      { token: "variable.parameter.function", foreground: "#E0AF68" },
      { token: "variable.other.constant", foreground: "#FF9E64" },
      { token: "variable.property", foreground: "#7DCFFF" },
      { token: "variable.object.property", foreground: "#73DACA" },
      { token: "keyword", foreground: "#BB9AF7" },
      { token: "keyword.local", foreground: "#997BD6", fontStyle: "italic" },
      { token: "keyword.operator", foreground: "#89DDFF" },
      { token: "keyword.operator.type.annotation", foreground: "#9ABDF5" },
      { token: "keyword.operator.typedef.annotation", foreground: "#89DDFF" },
      {
        token: "keyword.control.export",
        foreground: "#997BD6",
        fontStyle: "italic",
      },
      { token: "operator", foreground: "#89DDFF" },
      { token: "operator.type", foreground: "#BB9AF7" },
      { token: "operator.special", foreground: "#BB9AF7" },
      { token: "entity.name.type.alias", foreground: "#5ab6d6" },
      { token: "entity.name.function", foreground: "#7AA2F7" },
      { token: "global", foreground: "#7AA2F7" },
      { token: "storage.type", foreground: "#BB9AF7" },
      { token: "comment", foreground: "#666666", fontStyle: "italic" },
      {
        token: "comment.highlight.title",
        foreground: "#89DDFF",
        fontStyle: "italic",
      },
      {
        token: "comment.highlight.name",
        foreground: "#89DDFF",
        fontStyle: "italic",
      },
      {
        token: "comment.delimiter.modifier",
        foreground: "#9ABDF5",
        fontStyle: "italic",
      },
      {
        token: "comment.highlight.modifier",
        foreground: "#7DCFFF",
        fontStyle: "italic",
      },
      {
        token: "comment.highlight.descriptor",
        foreground: "#F7768E",
        fontStyle: "italic",
      },
      { token: "delimiter.longstring", foreground: "#89DDFF" },
      { token: "delimiter.bracket", foreground: "#a6afbd" },
      { token: "delimiter.array", foreground: "#a6afbd" },
      { token: "delimiter.parenthesis", foreground: "#a6afbd" },
      { token: "delimiter", foreground: "#a6afbd" },
      { token: "string", foreground: "#9ECE6A" },
      { token: "string_double", foreground: "#9ECE6A" },
      { token: "string_single", foreground: "#9ECE6A" },
      { token: "string_backtick", foreground: "#9ECE6A" },
      { token: "longstring", foreground: "#9ECE6A" },
      { token: "string.delimeter", foreground: "#89DDFF" },
      { token: "string.escape", foreground: "#89DDFF" },
      { token: "punctuation.separator.arguments", foreground: "#9ABDF5" },
      { token: "punctuation.separator.parameter", foreground: "#89DDFF" },
      { token: "punctuation.separator.table", foreground: "#89DDFF" },
      { token: "punctuation.definition.block", foreground: "#9ABDF5" },
      { token: "punctuation.definition.parameters", foreground: "#9ABDF5" },
      { token: "punctuation.definition.typeparameters", foreground: "#89DDFF" },
      { token: "constant.language", foreground: "#FF9E64" },
      { token: "number", foreground: "#FF9E64" },
      { token: "constants", foreground: "#FF9E64" },
      { token: "support.function", foreground: "#0DB9D7" },
      { token: "support.function.library", foreground: "#0DB9D7" },
      { token: "support.type", foreground: "#0DB9D7" },
      { token: "support.function", foreground: "#0DB9D7" },
      { token: "support.function.library", foreground: "#0DB9D7" },
      { token: "support.type", foreground: "#5ab6d6" },
    ],
    colors: monacoColors,
  });


    if (editor) {
      monaco.editor.setTheme("rustrogen");
    }
  }

  function closeWindow() {
    appWindow.close();
  }

  function minimizeWindow() {
    appWindow.minimize();
  }

  function maximizeWindow() {
    appWindow.isMaximized().then((isMaximized) => {
      if (isMaximized) {
        appWindow.unmaximize();
      } else {
        appWindow.maximize();
      }
    });
  }


  let contentChangeListener: monaco.IDisposable | null = null;
  let unlisten: (() => void) | null = null;

  function startTypingAnimation() {
    clearInterval(typingInterval);
    typingText = "";
    typingIndex = 0;

    fullText = activeTab ? activeTab.code : "-- Welcome to Rustrogen";

    typingInterval = window.setInterval(() => {
      if (typingIndex < fullText.length) {
        typingText += fullText.charAt(typingIndex);
        typingIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          if (editor && activeTab) {
            editor.setValue(activeTab.code);

            const model = editor.getModel();
            if (model) {
              const lastLine = model.getLineCount();
              const lastColumn = model.getLineMaxColumn(lastLine);
              editor.setPosition({ lineNumber: lastLine, column: lastColumn });
              editor.revealPosition({
                lineNumber: lastLine,
                column: lastColumn,
              });
              editor.focus();
            }
          }
        }, 500);
      }
    }, 50);
  }

  async function initializeRobloxLogs() {
    if (!logInitialized) {
      logInitialized = true;
      try {
        logs.push("[*] Initializing Roblox log monitoring...");
        logs = logs;

        const result = await invoke("get_roblox_logs");
        logs.push("[+] Successfully started log monitoring");
        logs = logs;
      } catch (error) {
        logs.push(`[!] Failed to initialize log monitoring: ${error}`);
        logs = logs;
      }
    }
  }

  let windowWidth = 0;
  let isMobile = false;

  onMount(async () => {
    loadSettings();

    initLuauLanguage();

    applyTheme($settings.theme);

    editor = monaco.editor.create(editorContainer, {
      value: code,
      language: "luau",
      theme: "rustrogen",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: $settings.fontSize,
      fontFamily: $settings.fontFamily,
      scrollBeyondLastLine: false,
      padding: { top: 15, bottom: 15 },
      lineNumbers: "on",
      wordWrap: $settings.wordWrap ? "on" : "off",
      tabSize: $settings.tabSize,
      scrollbar: {
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        vertical: "visible",
        horizontal: "visible",
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    });

    monaco.editor.setTheme("rustrogen");

    contentChangeListener = editor.onDidChangeModelContent(() => {
      if (activeTab && editor) {
        tabs[activeTabIndex].code = editor.getValue();
        tabs = tabs;

        if ($settings.autoSave) {
          console.log("Auto-saving...");
        }
      }
    });

    try {
      const editorAny = editor as any;
      if (editorAny._modelData && editorAny._modelData.cursor) {
        const originalUpdateCursor = editorAny._modelData.cursor.update;
        if (originalUpdateCursor) {
          editorAny._modelData.cursor.update = function (...args: unknown[]) {
            originalUpdateCursor.apply(this, args);
            const cursorElement = document.querySelector(
              ".monaco-editor .cursor",
            );
            if (cursorElement) {
              cursorElement.classList.add("animated-cursor");
            }
          };
        }
      }
    } catch (error) {
      console.warn("Could not apply cursor animation:", error);
    }

    editorReady = true;
    startTypingAnimation();

    unlisten = await listen<string>("roblox-log", (event) => {
      let log = event.payload;
      log = log.replace(/info\s/g, "");
      logs.push(log);
      logs = [...logs];

      setTimeout(() => {
        const logOutput = document.querySelector(".log-output");
        if (logOutput) {
          logOutput.scrollTop = logOutput.scrollHeight;
        }
      }, 10);
    });

    await initializeRobloxLogs();
  });

  onDestroy(() => {
    contentChangeListener?.dispose();
    editor?.dispose();
    unlisten?.();
    if (warningTimeout) clearTimeout(warningTimeout);
    if (typingInterval) clearInterval(typingInterval);
  });

  function displayWarning() {
    showLastTabWarning = true;
    if (warningTimeout) clearTimeout(warningTimeout);
    warningTimeout = window.setTimeout(() => {
      showLastTabWarning = false;
    }, 3000);
  }

  async function switchTab(index: number) {
    if (
      index !== activeTabIndex &&
      index >= 0 &&
      index < tabs.length &&
      !activeTabTransitioning
    ) {
      activeTabTransitioning = true;

      if (editor && activeTab) {
        tabs[activeTabIndex].code = editor.getValue();
      }

      activeTabIndex = index;

      if (editor && tabs[index]) {
        fullText = tabs[index].code;
        editor.setValue(tabs[index].code);
      }

      await tick();
      activeTabTransitioning = false;
    }
  }

  async function addTab() {
    const newTab: Tab = {
      id: nextTabId++,
      name: `Script ${nextTabId - 1}`,
      code: `-- Script ${nextTabId - 1}`,
    };
    tabs = [...tabs, newTab];
    await tick();
    switchTab(tabs.length - 1);
  }

  async function closeTab(index: number) {
    if (tabs.length <= 1) {
      displayWarning();
      return;
    }

    tabs = tabs.filter((_, i) => i !== index);

    if (index <= activeTabIndex) {
      activeTabIndex = Math.max(0, activeTabIndex - 1);
    }

    if (editor && tabs[activeTabIndex]) {
      editor.setValue(tabs[activeTabIndex].code);
    }
  }

  async function execute(event: Event) {
    event.preventDefault();
    if (isExecuting || !activeTab) return;

    isExecuting = true;
    output = "[*] Executing script...\n";
    logs.push("[*] Executing script...");
    logs = [...logs];

    try {
      const result = await invoke("execute", { code: activeTab.code });
      const successMessage = result
        ? String(result)
        : "[+] Execution successful";
      output += successMessage;
      logs.push(successMessage);
      logs = [...logs];
    } catch (error) {
      const errorMessage = `[!] Execution failed: ${error}`;
      output += errorMessage;
      logs.push(errorMessage);
      logs = [...logs];
    } finally {
      isExecuting = false;
    }
  }

  function toggleConsole() {
    consoleVisible = !consoleVisible;
  }

  function toggleSettings() {
    settingsVisible = !settingsVisible;
  }

  function tabDisplayName(tab: Tab) {
    if (isMobile && tab.name.length > 10) {
      return tab.name.substring(0, 8) + "...";
    }
    return tab.name;
  }

  function toggleMenu() {
    menuVisible = !menuVisible;
  }

  function openScriptHub() {
    menuVisible = false;
    // load /scripthub
    goto("/scripthub");
  }

  function openAutoExecute() {
    menuVisible = false;
  }
</script>

<div
  class="app-container"
  class:mobile={isMobile}
  class:console-visible={consoleVisible}
  data-tauri-drag-region
>
  <div class="header-container">
    <div class="tabs-container" data-tauri-drag-region>
      <div class="traffic-lights" data-tauri-drag-region>
        <div
          class="traffic-light close"
          data-action="Close"
          title="Close window"
          on:click={closeWindow}
          on:keydown={(e) => e.key === 'Enter' && closeWindow()}
          tabindex="0"
          aria-label="Close window"
          role="button"
        ></div>
        <div
          class="traffic-light minimize"
          on:click={minimizeWindow}
          data-action="Minimize"
          aria-label="Minimize window"
          on:keydown={(e) => e.key === 'Enter' && closeWindow()}
          tabindex="0"
          role="button"
        ></div>
        <div
          class="traffic-light maximize"
          on:click={maximizeWindow}
          data-action="Maximize"
          tabindex="0"
          aria-label="Maximize window"
          on:keydown={(e) => e.key === 'Enter' && closeWindow()}
          role="button"
        ></div>
      </div>
      
      <ul class="tabs" class:simple-tabs={$settings.simpleTabStyle || isMobile}  data-tauri-drag-region>
          {#each tabs as tab, index (tab.id)}
            <li
              class="tab {index === activeTabIndex
                ? 'active'
                : ''} {$settings.simpleTabStyle ? 'simple-tab' : ''}"
              role="tab"
              tabindex="0"
              on:keydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  switchTab(index);
                }
              }}
              on:click={() => switchTab(index)}
              animate:flip={{ duration: 300 }}
              data-tauri-drag-region
            >
              {tabDisplayName(tab)}
              <button
                class="tab-close-btn"
                on:click|stopPropagation={() => closeTab(index)}
                aria-label="Close tab"
                data-tauri-drag-region
              >
                ×
              </button>
            </li>
          {/each}
        </ul>
    
        <button class="add-tab-btn" on:click={addTab} aria-label="Add new tab"
          >+</button
        >
      </div>
  </div>

  <div
    bind:this={editorContainer}
    class="editor-container"
    class:editor-expanded={!consoleVisible}
    in:fade={{ duration: 800, delay: 200 }}
  ></div>

  <div class="button-container">
    <div class="menu-container">
      <button
        class="hamburger-menu"
        on:click={toggleMenu}
        aria-label="Menu"
        in:fly={{ y: 20, duration: 500, delay: 400, easing: elasticOut }}
      >
        ☰
      </button>
      
      {#if menuVisible}
        <div
          class="menu-items"
          in:fly={{ y: 20, duration: 300, easing: quintOut }}
          out:fade={{ duration: 200 }}
        >
          <button class="menu-item" on:click={toggleSettings}>
            Settings
          </button>
          <button class="menu-item" on:click={openScriptHub}>
            Script Hub
          </button>
          <button class="menu-item" on:click={openAutoExecute}>
            Auto Execute Directory
          </button>
        </div>
      {/if}
    </div>

    <button
      class="execute-btn"
      class:executing={isExecuting}
      on:click={execute}
      disabled={isExecuting || !activeTab}
      aria-label="Execute script"
      in:fly={{ y: 20, duration: 500, delay: 500, easing: elasticOut }}
    >
      ▶
    </button>
  </div>

  {#if showLastTabWarning}
    <div
      class="warning-toast show"
      in:fly={{ y: 20, duration: 300, easing: quintOut }}
      out:fade={{ duration: 300 }}
    >
      You cannot close the last tab.
    </div>
  {/if}

  <button
    class="console-toggle-btn"
    on:click={toggleConsole}
    aria-label={consoleVisible ? "Hide console" : "Show console"}
  >
    Console {consoleVisible ? "▼" : "▲"}
  </button>

  {#if consoleVisible}
    <div
      class="log-container"
      in:slide={{ duration: 300, easing: quintOut }}
      out:slide={{ duration: 300 }}
    >
      <div class="log-header">
        <h3>Console Output</h3>
        <div class="log-controls">
          <button
            on:click={() => {
              logs = [];
              logs = logs;
            }}
            class="clear-logs-btn">Clear</button
          >
        </div>
      </div>
      <div class="log-output">
        {#each logs as log}
          <div
            class="log-entry"
            class:error={log.startsWith("[!]") || log.startsWith("error")}
            class:warning={log.startsWith("warning")}
            class:info={log.startsWith("[*]")}
            class:success={log.startsWith("[+]")}
          >
            {log}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if settingsVisible}
    <div
      class="settings-panel"
      in:fly={{ x: 300, duration: 300, easing: quintOut }}
      out:fly={{ x: 300, duration: 300 }}
    >
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="close-settings" on:click={toggleSettings}>&times;</button
        >
      </div>

      <div class="settings-section">
        <h3>Appearance</h3>

        <div class="setting-item">
          <label for="theme-select">Theme</label>
          <select
            id="theme-select"
            bind:value={$settings.theme}
            on:change={saveSettings}
          >
            {#each themes as theme}
              <option value={theme.id}>{theme.name}</option>
            {/each}
          </select>

          <div class="theme-preview">
            <div
              class="theme-color"
              style="background-color: var(--bg-primary)"
            ></div>
            <div
              class="theme-color"
              style="background-color: var(--bg-secondary)"
            ></div>
            <div
              class="theme-color"
              style="background-color: var(--accent-primary)"
            ></div>
            <div
              class="theme-color"
              style="background-color: var(--accent-tertiary)"
            ></div>
          </div>
        </div>

        <div class="setting-item">
          <label for="font-select">Font Family</label>
          <select
            id="font-select"
            bind:value={$settings.fontFamily}
            on:change={saveSettings}
          >
            {#each fonts as font}
              <option value={font.id}>{font.name}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>Editor</h3>

        <div class="setting-item">
          <label for="fontSize">Font Size</label>
          <input
            type="number"
            id="fontSize"
            min="10"
            max="24"
            bind:value={$settings.fontSize}
            on:change={saveSettings}
          />
        </div>

        <div class="setting-item">
          <label for="fontFamily">Font Family</label>
          <select
            id="fontFamily"
            bind:value={$settings.fontFamily}
            on:change={saveSettings}
          >
            {#each fonts as font}
              <option value={font.id}>{font.name}</option>
            {/each}
          </select>
        </div>

        <div class="setting-item">
          <label for="tabSize">Tab Size</label>
          <input
            type="number"
            id="tabSize"
            min="2"
            max="8"
            bind:value={$settings.tabSize}
            on:change={saveSettings}
          />
        </div>

        <div class="setting-item checkbox-wrapper">
          <input
            type="checkbox"
            id="wordWrap"
            bind:checked={$settings.wordWrap}
            on:change={saveSettings}
          />
          <label for="wordWrap">Word Wrap</label>
        </div>

        <div class="setting-item checkbox-wrapper">
          <input
            type="checkbox"
            id="autoSave"
            bind:checked={$settings.autoSave}
            on:change={saveSettings}
          />
          <label for="autoSave">Auto Save</label>
        </div>

        <div class="setting-item checkbox-wrapper">
          <input
            type="checkbox"
            id="simpleTabStyle"
            bind:checked={$settings.simpleTabStyle}
            on:change={saveSettings}
          />
          <label for="simpleTabStyle">Simple Tab Style</label>
        </div>
      </div>

      <div class="settings-section">
        <h3>About</h3>
        <p style="color: var(--text-secondary); font-size: 14px;">
          Rustrogen v1.0.0<br />
          A Tauri-based Lua script editor
        </p>
      </div>
    </div>
  {/if}
</div>
<style>
  @import "./style.css";
</style>
