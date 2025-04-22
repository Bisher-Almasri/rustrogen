<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { onMount, onDestroy, tick } from 'svelte'; // Import onDestroy
  import * as monaco from 'monaco-editor';
  import { init as initLuauLanguage } from '../languages/init';
  import { fade, fly, slide } from 'svelte/transition';
  import { quintOut, elasticOut } from 'svelte/easing';

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

  // Typing animation variables
  let typingText = "";
  let fullText = "// Welcome to Rustrogen - Your Lua playground";
  let typingIndex = 0;
  let typingInterval: number | undefined = undefined;

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

  function startTypingAnimation() {
    clearInterval(typingInterval);
    typingText = "";
    typingIndex = 0;
    
    typingInterval = window.setInterval(() => {
      if (typingIndex < fullText.length) {
        typingText += fullText.charAt(typingIndex);
        typingIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => {
          if (editor && activeTab) {
            editor.setValue(activeTab.code);
          }
        }, 500);
      }
    }, 50);
  }

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
      wordWrap: "on",
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

    // Add animation for cursor - using type assertion to avoid TypeScript errors
    try {
      // Use type assertion to access internal properties
      const editorAny = editor as any;
      if (editorAny._modelData && editorAny._modelData.cursor) {
        const originalUpdateCursor = editorAny._modelData.cursor.update;
        if (originalUpdateCursor) {
          editorAny._modelData.cursor.update = function(...args: unknown[]) {
            originalUpdateCursor.apply(this, args);
            const cursorElement = document.querySelector('.monaco-editor .cursor');
            if (cursorElement) {
              cursorElement.classList.add('animated-cursor');
            }
          };
        }
      }
    } catch (error) {
      console.warn('Could not apply cursor animation:', error);
    }

    editorReady = true;
    startTypingAnimation();
  });

  onDestroy(() => {
    contentChangeListener?.dispose();
    editor?.dispose();
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
    if (index !== activeTabIndex && index >= 0 && index < tabs.length && !activeTabTransitioning) {
      activeTabTransitioning = true;
      
      // Save current content
      if (editor && activeTab) {
        tabs[activeTabIndex].code = editor.getValue();
      }
      
      // Set the active tab index
      activeTabIndex = index;
      
      // Directly set the editor value to the tab's code without animation
      if (editor && tabs[index]) {
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
      code: `-- Script ${nextTabId - 1}`
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
    in:fade={{ duration: 800, delay: 200 }}
  ></div>

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

  {#if showLastTabWarning}
    <div 
      class="warning-toast show"
      in:fly={{ y: 20, duration: 300, easing: quintOut }}
      out:fade={{ duration: 300 }}
    >
      You cannot close the last tab.
    </div>
  {/if}
</div>

<style>
  @import './style.css';
</style>