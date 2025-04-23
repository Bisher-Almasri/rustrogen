<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount, onDestroy, tick } from "svelte";
  import * as monaco from "monaco-editor";
  import { init as initLuauLanguage } from "../languages/init";
  import { fade, fly, slide } from "svelte/transition";
  import { quintOut, elasticOut } from "svelte/easing";
  import { listen } from "@tauri-apps/api/event";

  let logs: string[] = [];
  let logInitialized = false;
  let consoleVisible = true;

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

  monaco.editor.defineTheme("rustrogen", {
    base: "vs-dark",
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
    colors: {
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
    },
  });

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

  onMount(async () => {
    initLuauLanguage();

    editor = monaco.editor.create(editorContainer, {
      value: code,
      language: "luau",
      theme: "rustrogen",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      scrollBeyondLastLine: false,
      padding: { top: 15, bottom: 15 },
      lineNumbers: "on",
      wordWrap: "on",
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

    contentChangeListener = editor.onDidChangeModelContent(() => {
      if (activeTab && editor) {
        tabs[activeTabIndex].code = editor.getValue();
        tabs = tabs;
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
      logs.push(event.payload);
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

  async function closeTab(index: number, event: MouseEvent) {
    event.stopPropagation();

    if (tabs.length <= 1) {
      displayWarning();
      return;
    }

    const closingTabId = tabs[index].id;
    tabs = tabs.filter((_, i) => i !== index);

    if (activeTabIndex === index) {
      const newIndex = Math.max(0, index - 1);
      activeTabIndex = -1;
      await tick();
      switchTab(newIndex);
    } else if (activeTabIndex > index) {
      activeTabIndex--;
      await tick();
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
</script>

<div class="app-container">
  <div class="tabs-container">
    <div class="tabs">
      {#each tabs as tab, index (tab.id)}
        <div
          class="tab"
          class:active={index === activeTabIndex}
          on:click={() => switchTab(index)}
          role="tab"
          aria-selected={index === activeTabIndex}
          tabindex="0"
          on:keydown={(e) => e.key === "Enter" && switchTab(index)}
          in:fly={{ x: 20, duration: 300, delay: index * 50 }}
          out:fade={{ duration: 200 }}
        >
          {tab.name}
          <button
            class="tab-close-btn"
            on:click={(e) => closeTab(index, e)}
            aria-label="Close tab {tab.name}"
            in:fade={{ duration: 200, delay: 300 + index * 50 }}
          >
            &times;
          </button>
        </div>
      {/each}
    </div>
    <button
      class="add-tab-btn"
      on:click={addTab}
      aria-label="Add new tab"
      in:fly={{ x: -20, duration: 300 }}
    >
      +
    </button>
  </div>

  <div
    bind:this={editorContainer}
    class="editor-container"
    class:editor-expanded={!consoleVisible}
    in:fade={{ duration: 800, delay: 200 }}
  ></div>

  <div class="button-container">
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
        <button
          on:click={() => {
            logs = [];
            logs = logs;
          }}
          class="clear-logs-btn">Clear</button
        >
      </div>
      <div class="log-output">
        {#each logs as log}
          <!-- keep the weird spacing here to prevent the text from breaking -->
          <span
            style="color: {log.startsWith('error')
              ? '#ff6565'
              : log.startsWith('warning')
                ? '#ffaa00'
                : "#fff"}"
            >{log} <br />
          </span>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  @import "./style.css";
</style>
