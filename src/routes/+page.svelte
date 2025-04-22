<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount, onDestroy, tick } from 'svelte';
  import * as monaco from 'monaco-editor';
  import { init as initLuauLanguage } from '../languages/init';

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

  let tabs: Tab[] = [
    { id: 1, name: "Script 1", code: `print("Hello from Tab 1!")` },
    { id: 2, name: "saved.lua", code: `-- Saved script content\nlocal x = 10\nprint(x * 2)` }
  ];
  let activeTabIndex = 0;
  let nextTabId = 3;

  $: activeTab = tabs[activeTabIndex];
  $: code = activeTab ? activeTab.code : '';

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
      { token: "keyword.control.export", foreground: "#997BD6", fontStyle: "italic" },
      { token: "operator", foreground: "#89DDFF" },
      { token: "operator.type", foreground: "#BB9AF7" },
      { token: "operator.special", foreground: "#BB9AF7" },
      { token: "entity.name.type.alias", foreground: "#5ab6d6" },
      { token: "entity.name.function", foreground: "#7AA2F7" },
      { token: "global", foreground: "#7AA2F7" },
      { token: "storage.type", foreground: "#BB9AF7" },
      { token: "comment", foreground: "#666666", fontStyle: "italic" },
      { token: "comment.highlight.title", foreground: "#89DDFF", fontStyle: "italic" },
      { token: "comment.highlight.name", foreground: "#89DDFF", fontStyle: "italic" },
      { token: "comment.delimiter.modifier", foreground: "#9ABDF5", fontStyle: "italic" },
      { token: "comment.highlight.modifier", foreground: "#7DCFFF", fontStyle: "italic" },
      { token: "comment.highlight.descriptor", foreground: "#F7768E", fontStyle: "italic" },
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
      { token: "support.type", foreground: "#5ab6d6" }
    ],
    colors: {
      "editor.background": "#1A1A1A",
      "editorLineNumber.foreground": "#7A7A7A",
      "editorLineNumber.activeForeground": "#BBBBBB",
      "editor.lineHighlightBackground": "#141414cc",
      "editorIndentGuide.background": "#282828",
      "editorSuggestWidget.background": "#181818",
      "editorSuggestWidget.border": "#000000",
      "editorSuggestWidget.foreground": "#D5D5D5",
      "editorSuggestWidget.selectedBackground": "#363636",
      "editorSuggestWidget.highlightForeground": "#18A0FB",
      "textCodeBlock.background": "#181818"
    }
  });

  let contentChangeListener: monaco.IDisposable | null = null;

  onMount(() => {
    initLuauLanguage();

    editor = monaco.editor.create(editorContainer, {
      value: code,
      language: 'luau',
      theme: 'rustrogen',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      scrollBeyondLastLine: false,
      padding: { top: 15, bottom: 15 },
      lineNumbers: 'on',
      roundedSelection: false,
      scrollbar: {
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      }
    });

    contentChangeListener = editor.onDidChangeModelContent(() => {
      if (activeTab && editor) {
        tabs[activeTabIndex].code = editor.getValue();
        tabs = tabs;
      }
    });

  });

  onDestroy(() => {
    contentChangeListener?.dispose();
    editor?.dispose();
    if (warningTimeout) clearTimeout(warningTimeout);
  });

  function displayWarning() {
    showLastTabWarning = true;
    if (warningTimeout) clearTimeout(warningTimeout);
    warningTimeout = window.setTimeout(() => {
      showLastTabWarning = false;
    }, 3000);
  }

  function switchTab(index: number) {
    if (index !== activeTabIndex && index >= 0 && index < tabs.length) {
      activeTabIndex = index;
      if (editor) {
         editor.setValue(tabs[activeTabIndex].code);
      }
    }
  }

  async function addTab() {
    const newTab: Tab = {
      id: nextTabId++,
      name: `Script ${nextTabId - 1}`,
      code: `print("Hello from new tab!")`
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

    try {
      const result = await invoke("execute", { code: activeTab.code });
      output += result ? String(result) : "[+] Execution successful";
    } catch (error) {
      output += `[!] Execution failed: ${error}`;
    } finally {
      isExecuting = false;
      console.log(output);
    }
  }
</script>

<style>
  @font-face {
    font-family: 'JetBrains Mono';
    src: url('/fonts/JetBrainsMono-Regular.woff2') format('woff2'),
         url('/fonts/JetBrainsMono-Regular.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    background-color: #1a1a1a;
    color: #e0e0e0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background-color: #1a1a1a;
    position: relative;
  }

  .tabs-container {
    display: flex;
    align-items: center;
    background-color: #1a1a1a;
  }

  .tabs {
    display: flex;
    flex-grow: 1;
    overflow-x: auto;
  }

  .tab {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    color: #a6afbd;
    cursor: pointer;
    background-color: #1a1a1a;
    white-space: nowrap;
    transition: color 0.2s, background-color 0.2s;
    position: relative;
    padding-right: 30px;
  }

  .tab:hover {
     color: #e0e0e0;
     background-color: #202020;
  }

  .tab.active {
    background-color: #1f1f1f;
    color: #ffffff;
    border-bottom: 2px solid #bb86fc;
    margin-bottom: -1px;
  }

  .tab-close-btn {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #a6afbd;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
  }

  .tab:hover .tab-close-btn {
    color: #e0e0e0;
  }

  .tab.active .tab-close-btn {
     color: #ffffff;
  }

  .tab-close-btn:hover {
    background-color: #444;
  }

  .add-tab-btn {
    padding: 10px 15px;
    background: none;
    border: none;
    color: #a6afbd;
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
  }

  .add-tab-btn:hover {
    color: #ffffff;
    background-color: #252525;
  }

  .editor-container {
    flex: 1;
    width: 100%;
    background-color: #1a1a1a;
    overflow: hidden;
  }

  .execute-btn {
    position: fixed;
    right: 20px;
    bottom: 20px;
    background-color: #bb86fc;
    color: #1a1a1a;
    border: none;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    transition: background-color 0.2s;
  }

  .execute-btn:hover {
    background-color: #9a67ea;
  }

  .execute-btn:disabled {
    background-color: #555;
    cursor: not-allowed;
  }

  .warning-toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #ff9e64;
    color: #1a1a1a;
    padding: 10px 20px;
    border-radius: 5px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 1001;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }

  .warning-toast.show {
    opacity: 1;
  }
</style>

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
          on:keydown={(e) => e.key === 'Enter' && switchTab(index)}
        >
          {tab.name}
          <button
            class="tab-close-btn"
            on:click={(e) => closeTab(index, e)}
            aria-label="Close tab {tab.name}"
          >
            &times;
          </button>
        </div>
      {/each}
    </div>
    <button class="add-tab-btn" on:click={addTab} aria-label="Add new tab">+</button>
  </div>

  <div bind:this={editorContainer} class="editor-container" />

  <button
    class="execute-btn"
    on:click={execute}
    disabled={isExecuting || !activeTab}
    aria-label="Execute script"
  >
    ▶
  </button>

  {#if showLastTabWarning}
    <div class="warning-toast show">
      You cannot close the last tab.
    </div>
  {/if}
</div>