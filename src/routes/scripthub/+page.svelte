<script lang="ts">
  import { onMount } from "svelte";
  import { settings, loadSettings, applyTheme } from "../../lib/stores";
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from "$app/navigation";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let appWindow = getCurrentWindow();
  
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
  let scripts: Script[] = [];
  let isLoading = true;
  let error = "";
  let currentPage = 1;
  let hasMoreScripts = true;
  
  // Search functionality
  let searchQuery = "";
  $: if (searchQuery) {
    search(searchQuery);
  } else {
    fetchScripts();
  }
  
  // Format timestamp to relative time
  function formatTime(timestamp: string): string {
    if (!timestamp) return "Unknown time";
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return "Just now";
    }
  }

  async function fetchScripts() {
    isLoading = true;
    try {
      const response = await invoke<string>("get_scripts", { page: currentPage });
      const data = JSON.parse(response);
      console.log(data);    
      
      if (data && data.scripts && Array.isArray(data.scripts)) {
        scripts = data.scripts.map((script: any) => ({
          id: script._id,
          title: script.title,
          user: script.user || {
            username: "Unknown",
            image: "/images/default-avatar.jpg",
            verified: false
          },
          views: script.views || 0,
          time: formatTime(script.createdAt || script.lastUpdated),
          thumbnail: script.image || "/images/default-thumbnail.jpg",
          verified: script.user?.verified || false,
          game: script.game?.title || "Unknown Game",
          description: script.description,
          discord: script.discord,
          testedExecutors: script.testedExecutors
        }));
        
        hasMoreScripts = scripts.length >= 10;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Failed to fetch scripts:", err);
      error = "Failed to load scripts. Please try again later.";
    } finally {
      isLoading = false;
    }
  }

  async function loadMoreScripts() {
    if (!hasMoreScripts || isLoading) return;
    
    currentPage++;
    isLoading = true;
    
    try {
      const response = await invoke<string>("get_scripts", { page: currentPage });
      const data = JSON.parse(response);
      
      if (data && data.scripts && Array.isArray(data.scripts)) {
        const newScripts = data.scripts.map((script: any) => ({
          id: script._id,
          title: script.title,
          user: script.user || {
            username: "Unknown",
            image: "/images/default-avatar.jpg",
            verified: false
          },
          views: script.views || 0,
          time: formatTime(script.createdAt || script.lastUpdated),
          thumbnail: script.image || "/images/default-thumbnail.jpg",
          verified: script.user?.verified || false,
          game: script.game?.title || "Unknown Game",
          description: script.description,
          discord: script.discord,
          testedExecutors: script.testedExecutors
        }));
        
        scripts = [...scripts, ...newScripts];
        hasMoreScripts = newScripts.length >= 10;
      } else {
        hasMoreScripts = false;
      }
    } catch (err) {
      console.error("Failed to load more scripts:", err);
      error = "Failed to load more scripts. Please try again.";
    } finally {
      isLoading = false;
    }
  }

  function navigateToScriptDetails(scriptId: string) {
    goto(`/scripthub/${scriptId}`);
  }

  async function search(query: string) {
    isLoading = true;
    currentPage = 1;

    try {
      const response = await invoke<string>("get_scripts", { page: currentPage, search: query });
      const data = JSON.parse(response);
      
      if (data && data.scripts && Array.isArray(data.scripts)) {
        scripts = data.scripts.map((script: any) => ({
          id: script._id,
          title: script.title,
          user: script.user || {
            username: "Unknown",
            image: "/images/default-avatar.jpg",
            verified: false
          },
          views: script.views || 0,
          time: formatTime(script.createdAt || script.lastUpdated),
          thumbnail: script.image || "/images/default-thumbnail.jpg",
          verified: script.user?.verified || false,
          game: script.game?.title || "Unknown Game",
          description: script.description,
          discord: script.discord,
          testedExecutors: script.testedExecutors
        }));
        
        hasMoreScripts = scripts.length >= 10;
      } else {
        hasMoreScripts = false;
      }
    } catch (err) {
      console.error("Failed to search scripts:", err);
      error = "Failed to search scripts. Please try again.";
    } finally {
      isLoading = false;
    }
  }
  
  onMount(() => {
    loadSettings();
    applyTheme($settings.theme);
    fetchScripts();
  });
  
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

<div class="scripthub-container" data-tauri-drag-region>
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
    <button class="back-button" on:click={() => goto("/")} data-tauri-drag-region>
      ← Back to Editor
    </button>
  </div>
  
  <div class="search-bar">
    <input 
      type="text" 
      placeholder="Search scripts..." 
      bind:value={searchQuery}
    />
    <button class="search-button" on:click={() => search(searchQuery)}>
      <span class="search-icon">🔍</span>
      Search
    </button>
  </div>

  {#if isLoading && scripts.length === 0}
    <div class="scripts-grid">
      {#each Array(8) as _}
        <div class="script-card skeleton">
          <div class="thumbnail-container skeleton-thumbnail"></div>
          <div class="script-info">
            <div class="script-header">
              <div class="author-avatar skeleton-avatar"></div>
              <div class="script-details">
                <div class="skeleton-title"></div>
                <div class="skeleton-meta"></div>
              </div>
            </div>
            <div class="script-stats">
              <div class="skeleton-stats"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if error && scripts.length === 0}
    <div class="error-container">
      <p>{error}</p>
      <button class="retry-button" on:click={fetchScripts}>Retry</button>
    </div>
  {:else}
    <div class="scripts-grid">
      {#each scripts as script (script.id)}
        <div class="script-card" 
          on:click={() => navigateToScriptDetails(script.id)} 
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigateToScriptDetails(script.id);
            }
          }}
          role="button"
          tabindex="0"
        >
          <div class="thumbnail-container">
            <img src={script.thumbnail} alt={script.title} class="script-thumbnail" />
            <div class="game-badge">{script.game}</div>
          </div>
          <div class="script-info">
            <div class="script-header">
              <div class="author-avatar">
                <img src={script.user?.image || "/images/default-avatar.jpg"} alt={script.user?.username || "Unknown"} class="author-image" />
              </div>
              <div class="script-details">
                <h3 class="script-title">{script.title}</h3>
                <div class="script-meta">
                  <span class="author-name">{script.user?.username || "Unknown"}</span>
                  {#if script.user?.verified}
                    <span class="verified-badge">✓</span>
                  {/if}
                </div>
              </div>
            </div>
            <div class="script-stats">
              <span class="views-count">{script.views} views</span>
              <span class="time-ago">• {script.time}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>

    {#if scripts.length === 0}
      <div class="no-results">
        <p>No scripts found matching "{searchQuery}"</p>
      </div>
    {/if}

    {#if hasMoreScripts}
      <div class="load-more-container">
        <button class="load-more-button" on:click={loadMoreScripts} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  @import './style.css';
  
  :global(html), :global(body) {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  
  :global(::-webkit-scrollbar) {
    width: 0 !important;
    display: none !important;
    height: 0 !important;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
  }
  
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: var(--accent-primary);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 16px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .skeleton {
    animation: pulse 1.5s infinite;
  }

  .skeleton-thumbnail {
    width: 100%;
    height: 160px;
    background: var(--bg-tertiary);
    border-radius: 8px;
  }

  .skeleton-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-tertiary);
  }

  .skeleton-title {
    height: 20px;
    width: 80%;
    background: var(--bg-tertiary);
    border-radius: 4px;
    margin-bottom: 8px;
  }

  .skeleton-meta {
    height: 16px;
    width: 60%;
    background: var(--bg-tertiary);
    border-radius: 4px;
  }

  .skeleton-stats {
    height: 16px;
    width: 40%;
    background: var(--bg-tertiary);
    border-radius: 4px;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
</style>