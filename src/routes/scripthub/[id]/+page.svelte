<script lang="ts">
  import { onMount } from "svelte";
  import { settings, loadSettings, applyTheme } from "../../../lib/stores";
  import { invoke } from "@tauri-apps/api/core";
  import { page } from "$app/stores";
  import { getCurrentWindow } from "@tauri-apps/api/window";
    import { goto } from "$app/navigation";

  interface User {
    _id: string;
    username: string;
    image: string;
    discord?: {
      id: string;
      username: string;
    };
    verified: boolean;
    displayEmail: boolean;
    socials?: {
      discordServer: string;
    };
    bio: string;
    admin: boolean;
    lastActive: string;
  }
  // Script interface
  interface Script {
    id: string;
    title: string;
    user: User;
    views: number;
    time?: string;
    thumbnail: string;
    verified: boolean;
    game: string;
    content?: string;
    description?: string;
    discord?: string;
    testedExecutors?: any[];
    rawScriptUrl?: string;
  }
  
  // State variables
  let script: Script | null = null;
  let isLoading = true;
  let error = "";
  let scriptContent = "";
  let isContentLoading = false;
  
  async function fetchScriptDetails() {
    isLoading = true;
    const scriptId = $page.params.id;
    
    try {
      const response = await invoke<string>("get_script_details", { id: scriptId });
      const scriptDetails = JSON.parse(response);
      
      if (scriptDetails.script && scriptDetails.script[0]) {
        const details = scriptDetails.script[0];
        script = {
          id: details._id,
          title: details.title,
          user: details.user || {
            username: "Unknown",
            image: "/images/default-avatar.jpg",
            verified: false
          },
          views: details.views || 0,
          thumbnail: details.image || "/images/default-thumbnail.jpg",
          verified: details.user?.verified || false,
          game: details.game?.title || "Unknown Game",
          description: details.description,
          discord: details.discord,
          testedExecutors: details.testedExecutors,
          rawScriptUrl: details.rawScript
        };
        
        // Fetch the raw script content
        await fetchRawScript(details.rawScript);
      } else {
        throw new Error("Invalid script details format");
      }
    } catch (err) {
      console.error("Failed to fetch script details:", err);
      error = "Failed to load script details. Please try again.";
    } finally {
      isLoading = false;
    }
  }
  
  async function fetchRawScript(url: string) {
    if (!url) {
      scriptContent = "No script content available";
      return;
    }
    
    isContentLoading = true;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      scriptContent = await response.text();
    } catch (err) {
      console.error("Failed to fetch raw script:", err);
      scriptContent = "Failed to load script content. Please try again.";
    } finally {
      isContentLoading = false;
    }
  }
  
  function copyToEditor() {
    if (!scriptContent) return;
    
    localStorage.setItem('scriptContent', scriptContent);
    localStorage.setItem('scriptTitle', script?.title || "Untitled Script");
    
    goto("/");
  }
  
  onMount(() => {
    loadSettings();
    applyTheme($settings.theme);
    fetchScriptDetails();
  });

  let appWindow = getCurrentWindow();
  
  // Window control functions
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
</script>

<div class="script-detail-container" data-tauri-drag-region>
  <div class="header-container" data-tauri-drag-region>
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
        on:keydown={(e) => e.key === 'Enter' && minimizeWindow()}
        tabindex="0"
        role="button"
      ></div>
      <div
        class="traffic-light maximize"
        on:click={maximizeWindow}
        data-action="Maximize"
        tabindex="0"
        aria-label="Maximize window"
        on:keydown={(e) => e.key === 'Enter' && maximizeWindow()}
        role="button"
      ></div>
    </div>
    <button class="back-button" on:click={() => goto("/scripthub")} data-tauri-drag-region>
      ← Back to Script Hub
    </button>
  </div>
  
  {#if isLoading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading script details...</p>
    </div>
  {:else if error}
    <div class="error-container">
      <p>{error}</p>
      <button class="retry-button" on:click={fetchScriptDetails}>Retry</button>
    </div>
  {:else if script}
    <div class="script-header">
      <div class="script-title-section">
        <h1>{script.title}</h1>
        <div class="script-meta">
          <div class="author-info">
            <div class="author-avatar">
              <img src={script.user.image} alt={script.user.username} class="author-image" />
            </div>
            <span class="author-name">{script.user.username}</span>
            {#if script.verified}
              <span class="verified-badge">✓</span>
            {/if}
          </div>
          <div class="script-stats">
            <span class="views-count">{script.views} views</span>
          </div>
        </div>
      </div>
      
      <div class="script-thumbnail">
        <img src={script.thumbnail} alt={script.title} />
        <div class="game-badge">{script.game}</div>
      </div>
    </div>
    
    {#if script.description}
      <div class="script-description">
        <h3>Description</h3>
        <p>{script.description}</p>
      </div>
    {/if}
    
    {#if script.discord}
      <div class="discord-section">
        <a href={script.discord} target="_blank" rel="noopener noreferrer" class="discord-link">
          Join Discord Server
        </a>
      </div>
    {/if}
    
    {#if script.testedExecutors && script.testedExecutors.length > 0}
      <div class="tested-executors">
        <h3>Tested Executors</h3>
        <div class="executor-list">
          {#each script.testedExecutors as executor}
            <div class="executor-item">
              <img src={executor.image} alt={executor.title} />
              <span>{executor.title}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    
    <div class="script-content-section">
      <h3>Script Content</h3>
      {#if isContentLoading}
        <div class="content-loading">
          <div class="loading-spinner small"></div>
          <p>Loading script content...</p>
        </div>
      {:else}
        <pre class="script-content">{scriptContent}</pre>
        <div class="content-actions">
          <button class="copy-button" on:click={copyToEditor}>
            Copy to Editor
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  @import './style.css';
  
  .header-container {
    display: flex;
    align-items: center;
    /* margin-bottom: 20px; */
    -webkit-app-region: drag;
    position: sticky;
    top: 0;
  }
  
  .traffic-lights {
    display: flex;
    gap: 8px;
    margin-right: 15px;
    -webkit-app-region: no-drag;
  }
  
  .back-button {
    -webkit-app-region: no-drag;
  }
</style>