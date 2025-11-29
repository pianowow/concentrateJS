<script setup lang="ts">
   import {
      ref,
      type Ref,
      shallowRef,
      markRaw,
      onMounted,
      onUnmounted,
      computed,
      watch,
   } from 'vue';
   import BoardGrid from './BoardGrid.vue';
   import SearchResults from './SearchResults.vue';
   import HistoryTable from './HistoryTable.vue';
   import { Player, Play } from '../ts/player';
   import {
      type ThemeName,
      type ThemeConfig,
      Themes,
      mapsToColors,
      Score,
      convertBoardScore,
   } from '../ts/board';
   import { roundTo } from '../ts/util';

   const themes = new Themes();
   const themeSelected = ref<ThemeName>('Light');
   const theme = computed<ThemeConfig>(() => themes[themeSelected.value]);
   watch(
      theme,
      (t) => {
         document.body.style.backgroundColor = t.defaultColor;
         document.body.style.color = t.defaultText;
      },
      { immediate: true }
   );
   watch(themeSelected, () => {
      saveToLocalStorage();
   });
   const availableThemes = Object.keys(themes) as ThemeName[];
   class HistoryEntry {
      type: number; //1 blue, -1 red, 0 initial position
      text: string; //word played or board letters
      colors: string;
      score: number;
      constructor(type: number, text: string, colors: string, score: number) {
         this.type = type;
         this.text = text;
         this.colors = colors;
         this.score = score;
      }
   }
   const showBoardEdit = ref(false);
   const showSettings = ref(false);
   const moveIndicator = ref<number>(1);
   const boardLetters = ref('');
   const boardLettersUpperCase = computed(() => boardLetters.value.toUpperCase());
   const colorLetters = ref('');
   const colorLettersUpperCase = computed(() => colorLetters.value.toUpperCase());
   const boardColorsExpanded = computed(() => {
      let lastColor = 'W';
      let answer = '';
      for (let i = 0; i < colorLetters.value.length; i++) {
         const c = colorLetters.value.charAt(i);
         if ('Rr'.includes(c)) {
            lastColor = 'r';
            answer += lastColor;
         } else if ('Bb'.includes(c)) {
            lastColor = 'b';
            answer += lastColor;
         } else if ('Ww'.includes(c)) {
            lastColor = 'w';
            answer += lastColor;
         } else if ('23456789'.includes(c)) {
            for (let n = 2; n < parseInt(c); n++) {
               answer += lastColor;
            }
            answer += lastColor;
         }
         if (answer.length >= 25) {
            answer = answer.slice(0, 25);
         }
      }
      if (answer.length < 25) {
         return answer.padEnd(25, 'w');
      }
      return answer;
   });
   const boardColorsDefended = computed(() => {
      let answer = '';
      const colors = boardColorsExpanded.value;
      for (let i = 0; i < 25; i++) {
         const c = colors.charAt(i);
         if (c === 'w') {
            answer += c;
            continue;
         }
         if (i + 5 < 25 && colors.charAt(i + 5) != c) {
            answer += c;
            continue;
         }
         if (i - 5 >= 0 && colors.charAt(i - 5) != c) {
            answer += c;
            continue;
         }
         if (i % 5 < 4 && colors.charAt(i + 1) != c) {
            answer += c;
            continue;
         }
         if (i % 5 > 0 && colors.charAt(i - 1) != c) {
            answer += c;
            continue;
         }
         answer += c.toUpperCase();
      }
      return answer;
   });
   const historyList: Ref<HistoryEntry[]> = ref(new Array<HistoryEntry>());
   const selectedHistoryIndex: Ref<number | null> = ref(null);
   const showSearchFilters = ref(false);
   const needLetters = ref('');
   const needLettersUpperCase = computed(() => needLetters.value.toUpperCase());
   const notLetters = ref('');
   const notLettersUpperCase = computed(() => notLetters.value.toUpperCase());
   const wordFilter = ref('');
   const wordFilterDebounced = ref('');
   let wordFilterDebounceHandle: number | undefined;
   watch(wordFilter, (val) => {
      if (wordFilterDebounceHandle) clearTimeout(wordFilterDebounceHandle);
      wordFilterDebounceHandle = window.setTimeout(() => {
         wordFilterDebounced.value = val;
      }, DEBOUNCE_MS);
   });
   const searchResults: Ref<Play[]> = shallowRef<Play[]>([]);
   let player: Ref<Player | null> = shallowRef<Player | null>(null);
   const boardPreviewCellSize = 9;
   const isMobile = ref(false);
   const navPreviewCellSize = computed(() => (isMobile.value ? 9 : 25));

   function updateIsMobile() {
      isMobile.value = window.innerWidth <= 1150;
   }
   const LOCAL_STORAGE_KEY = 'concentrate-state';
   const games: Ref<StoredGameState[]> = ref([]);
   const selectedGameId: Ref<string | null> = ref(null);
   const draggedGameId: Ref<string | null> = ref(null);
   const dragOverIndex: Ref<number | null> = ref(null);

   const gamesDisplayOrder = computed(() => {
      if (draggedGameId.value === null || dragOverIndex.value === null) {
         return games.value;
      }
      const fromIdx = games.value.findIndex((g) => g.id === draggedGameId.value);
      if (fromIdx === -1 || fromIdx === dragOverIndex.value) {
         return games.value;
      }
      const reordered = [...games.value];
      const [movedGame] = reordered.splice(fromIdx, 1);
      reordered.splice(dragOverIndex.value, 0, movedGame!);
      return reordered;
   });

   interface StoredGameState {
      historyList: HistoryEntry[];
      selectedHistoryIndex: number | null;
      moveIndicator: number;
      id: string;
      createdAt: number;
   }

   interface AppState {
      theme: ThemeName;
      games: StoredGameState[];
      selectedGameId: string | null;
   }

   function generateGameId(): string {
      return `game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
   }

   function updateCurrentGameInArray() {
      if (!selectedGameId.value) return;
      const idx = games.value.findIndex((g) => g.id === selectedGameId.value);
      if (idx !== -1) {
         games.value[idx] = {
            ...games.value[idx]!,
            historyList: historyList.value,
            selectedHistoryIndex: selectedHistoryIndex.value,
            moveIndicator: moveIndicator.value,
         };
      }
   }

   function saveToLocalStorage() {
      updateCurrentGameInArray();
      const state: AppState = {
         theme: themeSelected.value,
         games: games.value,
         selectedGameId: selectedGameId.value,
      };
      try {
         localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
         console.warn('Failed to save state to local storage:', e);
      }
   }

   function loadFromLocalStorage(): AppState | null {
      try {
         const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
         if (stored) {
            const parsed = JSON.parse(stored) as AppState;
            // Validate the parsed data has expected structure
            if (
               Array.isArray(parsed.games) &&
               parsed.games.length > 0 &&
               typeof parsed.theme === 'string'
            ) {
               return parsed;
            }
         }
      } catch (e) {
         console.warn('Failed to load state from local storage:', e);
      }
      return null;
   }

   function getGameBoardLetters(game: StoredGameState): string {
      const initial = game.historyList.find((h) => h.type === 0);
      return initial?.text.toUpperCase() ?? '';
   }

   function getGameCurrentColors(game: StoredGameState): string {
      const idx = game.selectedHistoryIndex ?? game.historyList.length - 1;
      return game.historyList[idx]?.colors ?? '';
   }

   function loadGameState(game: StoredGameState) {
      historyList.value = game.historyList.map(
         (h) => new HistoryEntry(h.type, h.text, h.colors, h.score)
      );
      selectedHistoryIndex.value = game.selectedHistoryIndex;
      moveIndicator.value = game.moveIndicator;

      // Extract board letters from initial history entry
      const initialEntry = historyList.value[0];
      if (initialEntry && initialEntry.type === 0) {
         boardLetters.value = initialEntry.text.toUpperCase();
      } else {
         boardLetters.value = '';
      }

      // Set color letters from selected index or last entry
      const idx = selectedHistoryIndex.value ?? historyList.value.length - 1;
      if (historyList.value[idx]) {
         colorLetters.value = historyList.value[idx]!.colors;
      } else {
         colorLetters.value = '';
      }

      // Show edit board section if board is incomplete
      if (boardLetters.value.length !== 25) {
         showBoardEdit.value = true;
      } else {
         showBoardEdit.value = false;
      }

      // Recalculate scores and reset player state
      if (player.value) {
         player.value.possible(boardLettersUpperCase.value);
         for (const h of historyList.value) {
            const s: Score = convertBoardScore(h.colors.toUpperCase());
            h.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
         }
         const played = historyList.value.slice(1, idx + 1).map((a) => a.text);
         player.value.resetplayed(boardLettersUpperCase.value, played);
      }
   }

   function selectGame(gameId: string) {
      if (selectedGameId.value === gameId) return;
      updateCurrentGameInArray();
      const game = games.value.find((g) => g.id === gameId);
      if (game) {
         selectedGameId.value = gameId;
         loadGameState(game);
         saveToLocalStorage();
         updateQueryParams();
         runSearch();
      }
   }

   function createNewGame(useDefault: boolean = false) {
      updateCurrentGameInArray();
      const newId = generateGameId();
      const defaultBoard = useDefault ? 'CONCENTRATEFORLETTERPRESS' : '';
      const defaultColors = useDefault ? 'BBBBBBWWWrrRRRRRBBBBBWWWrr' : '';
      const newGame: StoredGameState = {
         id: newId,
         createdAt: Date.now(),
         historyList: [new HistoryEntry(0, defaultBoard, defaultColors, 0)],
         selectedHistoryIndex: null,
         moveIndicator: 1,
      };
      games.value.push(newGame);
      selectedGameId.value = newId;
      loadGameState(newGame);
      saveToLocalStorage();
      updateQueryParams();
      runSearch();
   }

   function onDragStart(gameId: string) {
      draggedGameId.value = gameId;
   }

   function onDragOver(e: DragEvent, idx: number) {
      e.preventDefault();
      if (draggedGameId.value !== null) {
         dragOverIndex.value = idx;
      }
   }

   function onDrop(e: DragEvent) {
      e.preventDefault();
      if (draggedGameId.value === null || dragOverIndex.value === null) {
         draggedGameId.value = null;
         dragOverIndex.value = null;
         return;
      }

      const fromIdx = games.value.findIndex((g) => g.id === draggedGameId.value);

      if (fromIdx !== -1 && fromIdx !== dragOverIndex.value) {
         const [movedGame] = games.value.splice(fromIdx, 1);
         games.value.splice(dragOverIndex.value, 0, movedGame!);
         saveToLocalStorage();
      }

      draggedGameId.value = null;
      dragOverIndex.value = null;
   }

   function onDragEnd() {
      draggedGameId.value = null;
      dragOverIndex.value = null;
   }

   function deleteGame(gameId: string) {
      const idx = games.value.findIndex((g) => g.id === gameId);
      if (idx === -1) return;
      games.value.splice(idx, 1);

      if (selectedGameId.value === gameId) {
         if (games.value.length > 0) {
            // Select another game (prefer the one at same index, or last one)
            const newIdx = Math.min(idx, games.value.length - 1);
            const newGame = games.value[newIdx]!;
            selectedGameId.value = newGame.id;
            loadGameState(newGame);
         } else {
            // No games left, create a new default one
            createNewGame();
            return;
         }
      }
      saveToLocalStorage();
      updateQueryParams();
      runSearch();
   }

   function readQueryParams(): string | null {
      const params = new URLSearchParams(window.location.search);
      const gameId = params.get('id');
      const selected = params.get('selected');
      const rawHash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
      let index = 0;
      if (rawHash) {
         const parts = rawHash.split('.').filter(Boolean);
         const parsed: HistoryEntry[] = [];
         for (const part of parts) {
            const [t, text, colors] = part.split('-', 3);
            if (!t || !text || !colors) continue;
            const type = t === 'b' ? 1 : t === 'r' ? -1 : 0;
            parsed.push(new HistoryEntry(type, text, colors, 0));
         }
         if (parsed.length > 0) {
            historyList.value = parsed;
            if (parsed[0]!.type === 0 && parsed[0]!.text.length === 25) {
               boardLetters.value = parsed[0]!.text.toUpperCase();
            }
            const selectedNum = selected ? Number.parseInt(selected) : parsed.length - 1;
            index =
               !Number.isNaN(selectedNum) && selectedNum >= 0 && selectedNum < parsed.length
                  ? selectedNum
                  : parsed.length - 1;

            colorLetters.value = parsed[index]!.colors;
            const t = parsed[index]!.type;
            if (t === 0) {
               //I believe this assumes history has at least two entries?
               moveIndicator.value = parsed[index + 1]?.type ?? moveIndicator.value;
            } else {
               moveIndicator.value = -t;
            }

            selectedHistoryIndex.value = index;
         }
         if (player.value) {
            player.value.possible(boardLettersUpperCase.value);
            for (const h of historyList.value) {
               const s: Score = convertBoardScore(h.colors.toUpperCase());
               h.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
            }
            const played = historyList.value.slice(1, index + 1).map((a) => a.text);
            player.value.resetplayed(boardLettersUpperCase.value, played);
         }
         return gameId;
      }
      return null;
   }

   function updateQueryParams() {
      const params = new URLSearchParams();
      if (selectedGameId.value) params.set('id', selectedGameId.value);
      if (selectedHistoryIndex.value !== null)
         params.set('selected', selectedHistoryIndex.value.toString());
      const historyFragment = historyList.value
         .map((h) => {
            const t = h.type === 1 ? 'b' : h.type === -1 ? 'r' : 'i';
            return `${t}-${h.text}-${h.colors}.`;
         })
         .join('');
      const newUrl = `${window.location.pathname}?${params.toString()}#${historyFragment}`;
      history.replaceState(null, '', newUrl);
   }

   // Debounce state for searches
   let searchDebounceHandle: number | undefined;
   const DEBOUNCE_MS = 400;

   onMounted(async () => {
      updateIsMobile();
      window.addEventListener('resize', updateIsMobile);

      let wordList: string[] = await getWordList();
      player.value = markRaw(new Player(undefined, undefined, wordList));
      if (import.meta.env.DEV) window.player = player; //for console debug purposes

      // Load app state from local storage
      const storedState = loadFromLocalStorage();
      if (storedState) {
         themeSelected.value = storedState.theme;
         games.value = storedState.games;
         selectedGameId.value = storedState.selectedGameId;
      } else {
         // Set theme based on system preference
         const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
         themeSelected.value = prefersDark ? 'Dark' : 'Light';
      }

      // Check for URL params first (they override local storage)
      const urlGameId = readQueryParams();

      if (boardLetters.value) {
         // URL had game data - check if game ID exists in storage
         const existingGame = urlGameId ? games.value.find((g) => g.id === urlGameId) : null;
         if (existingGame) {
            // Update existing game with URL data
            selectedGameId.value = urlGameId;
            existingGame.historyList = historyList.value;
            existingGame.selectedHistoryIndex = selectedHistoryIndex.value;
            existingGame.moveIndicator = moveIndicator.value;
         } else {
            // Create new game from URL data
            const newId = urlGameId || generateGameId();
            const newGame: StoredGameState = {
               id: newId,
               createdAt: Date.now(),
               historyList: historyList.value,
               selectedHistoryIndex: selectedHistoryIndex.value,
               moveIndicator: moveIndicator.value,
            };
            games.value.push(newGame);
            selectedGameId.value = newId;
         }
      } else if (selectedGameId.value) {
         // Load selected game from storage
         const game = games.value.find((g) => g.id === selectedGameId.value);
         if (game) {
            loadGameState(game);
         } else if (games.value.length > 0) {
            // Selected game not found, load first game
            selectedGameId.value = games.value[0]!.id;
            loadGameState(games.value[0]!);
         } else {
            // First time user - create with default board
            createNewGame(true);
         }
      } else if (games.value.length > 0) {
         // No selection but games exist, select first
         selectedGameId.value = games.value[0]!.id;
         loadGameState(games.value[0]!);
      } else {
         // No games at all (first time user) - create with default board
         createNewGame(true);
      }

      saveToLocalStorage();
      updateQueryParams();
      runSearch();
   });

   function clearHistory() {
      historyList.value = new Array<HistoryEntry>();
      let score = 0;
      if (player.value) {
         player.value.possible(boardLettersUpperCase.value);
         let s: Score = convertBoardScore(boardColorsDefended.value);
         score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 2);
      }
      historyList.value.push(
         new HistoryEntry(0, boardLettersUpperCase.value, boardColorsDefended.value, score)
      );
      selectedHistoryIndex.value = null;
   }

   function clearHistorySyncState() {
      clearHistory();
      syncState();
   }

   function syncState() {
      updateQueryParams();
      saveToLocalStorage();
      if (searchDebounceHandle) {
         clearTimeout(searchDebounceHandle);
      }
      searchDebounceHandle = window.setTimeout(() => {
         runSearch();
      }, DEBOUNCE_MS);
   }

   function runSearch() {
      if (boardLetters.value.length == 25 && boardColorsDefended.value.split('w').length > 1) {
         if (!player.value) {
            searchResults.value = [];
            return;
         }
         const letters = boardLettersUpperCase.value;
         const colors = colorLettersUpperCase.value;
         const need = needLettersUpperCase.value;
         const not = notLettersUpperCase.value;
         const move = moveIndicator.value;
         searchResults.value = player.value.search(letters, colors, need, not, move);
      } else {
         searchResults.value = [];
      }
   }

   async function getWordList() {
      let wordList: string[] = [];
      try {
         let response;
         response = await fetch(new URL('word_lists/en.txt', document.baseURI));
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         const textData = await response.text();
         wordList = textData
            .toUpperCase()
            .split(/\r?\n/)
            .filter((word) => word.trim());
      } catch (error) {
         console.error('Failed to load word list:', error);
      }
      return wordList;
   }

   function addPlayToHistory(play: Play) {
      const colors = mapsToColors(play.blue_map, play.red_map);
      const word = (play.word ?? '').toUpperCase();
      const score = play.score ?? 0;

      if (selectedHistoryIndex.value !== null) {
         historyList.value = historyList.value.slice(0, selectedHistoryIndex.value + 1);
         player.value!.resetplayed(
            boardLettersUpperCase.value,
            historyList.value.slice(1, historyList.value.length).map((a) => a.text)
         );
      }

      historyList.value.push(new HistoryEntry(moveIndicator.value, word, colors, score));
      player.value!.playword(boardLettersUpperCase.value, word);
      selectedHistoryIndex.value = historyList.value.length - 1;
      colorLetters.value = colors;
      moveIndicator.value = -moveIndicator.value;
      searchResults.value = [];
      needLetters.value = '';
      notLetters.value = '';
      wordFilter.value = '';
      syncState();
   }

   function onHistoryRowClicked(entry: HistoryEntry, idx: number) {
      selectedHistoryIndex.value = idx >= 0 ? idx : null;
      colorLetters.value = entry.colors;
      // If the row corresponds to a move by Blue(1)/Red(-1), next to move is the opposite.
      if (entry.type === 0) {
         if (historyList.value.length > 1) {
            moveIndicator.value = historyList.value[1]!.type;
         }
      } else {
         moveIndicator.value = entry.type * -1;
      }
      player.value?.resetplayed(
         boardLettersUpperCase.value,
         historyList.value.slice(1, idx + 1).map((a) => a.text)
      );
      updateQueryParams();
      saveToLocalStorage();
      runSearch();
   }

   onUnmounted(() => {
      window.removeEventListener('resize', updateIsMobile);
   });
</script>

<template>
   <!-- Settings Modal -->
   <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="modal-content">
         <div class="modal-header">
            <h2>Settings</h2>
            <button class="modal-close" @click="showSettings = false" aria-label="Close">
               &times;
            </button>
         </div>
         <div class="modal-body">
            <div class="input-div">
               <label for="settings-theme-input">Theme</label>
               <select id="settings-theme-input" class="input" v-model="themeSelected">
                  <option v-for="t in availableThemes" :key="t" :value="t">{{ t }}</option>
               </select>
            </div>
         </div>
      </div>
   </div>

   <div class="layout">
      <aside class="menu-pane">
         <h2 class="app-title">Concentrate</h2>
         <nav class="menu-links">
            <a class="menu-link" @click="showSettings = true">Settings</a>
         </nav>
         <div class="games-section">
            <div class="games-header">
               <h3>Games</h3>
               <button class="new-game-btn" @click="createNewGame(false)" title="New Game">
                  +
               </button>
            </div>
            <div class="games-list">
               <div
                  v-for="(game, idx) in gamesDisplayOrder"
                  :key="game.id"
                  class="game-item"
                  :class="{
                     selected: game.id === selectedGameId,
                     dragging: game.id === draggedGameId,
                  }"
                  draggable="true"
                  @click="selectGame(game.id)"
                  @dragstart="onDragStart(game.id)"
                  @dragover="(e) => onDragOver(e, idx)"
                  @drop="onDrop"
                  @dragend="onDragEnd"
               >
                  <BoardGrid
                     :letters="getGameBoardLetters(game)"
                     :colors="getGameCurrentColors(game)"
                     :theme="theme"
                     :size="navPreviewCellSize"
                  />
                  <button
                     class="delete-game-btn"
                     @click.stop="deleteGame(game.id)"
                     title="Delete game"
                     v-if="games.length > 1"
                  >
                     &times;
                  </button>
               </div>
            </div>
         </div>
      </aside>
      <div class="left-pane">
         <BoardGrid
            :letters="boardLettersUpperCase"
            :colors="boardColorsDefended"
            :theme="theme"
            :size="50"
         />
         <div class="board-edit">
            <button
               title="click to show/hide"
               class="filters-toggle"
               type="button"
               @click="showBoardEdit = !showBoardEdit"
               :aria-expanded="showBoardEdit"
               aria-controls="board-input"
            >
               Edit Board
            </button>
            <div class="board-input" v-show="showBoardEdit">
               <div class="input-div">
                  <label for="turn-input">Turn</label>
                  <select
                     id="turn-input"
                     class="input"
                     v-model.number="moveIndicator"
                     @change="syncState()"
                  >
                     <option :value="1">{{ theme.blueName }} to play</option>
                     <option :value="-1">{{ theme.redName }} to play</option>
                  </select>
               </div>
               <h4>Note: changing board or color will clear history</h4>
               <div class="input-div">
                  <label for="board-input">Board</label>
                  <input
                     id="board-input"
                     class="input uppercase"
                     type="text"
                     v-model="boardLetters"
                     @input="clearHistorySyncState()"
                     maxlength="25"
                  />
               </div>
               <div class="input-div">
                  <label for="color-input">Color</label>
                  <input
                     id="color-input"
                     class="input uppercase"
                     type="text"
                     v-model="colorLetters"
                     @input="clearHistorySyncState()"
                     maxlength="25"
                  />
               </div>
            </div>
         </div>
         <h3>History</h3>
         <div class="history-grid">
            <HistoryTable
               :historyList="historyList"
               :boardLetters="boardLettersUpperCase"
               :theme="theme"
               :boardPreviewCellSize="boardPreviewCellSize"
               :selectedIndex="selectedHistoryIndex"
               @row-click="onHistoryRowClicked"
            />
         </div>
      </div>
      <div class="right-pane">
         <h3>Search Results</h3>
         <div class="filters-section">
            <div class="filters-header">
               <button
                  title="click to show/hide"
                  class="filters-toggle"
                  type="button"
                  @click="showSearchFilters = !showSearchFilters"
                  :aria-expanded="showSearchFilters"
                  aria-controls="filters-panel"
               >
                  Filters
               </button>
            </div>
            <div id="filters-panel" class="filters-panel" v-show="showSearchFilters">
               <div class="input-div">
                  <label for="need-input">Need</label>
                  <input
                     id="need-input"
                     class="input"
                     type="text"
                     v-model="needLetters"
                     @input="syncState"
                     maxlength="25"
                  />
               </div>
               <div class="input-div">
                  <label for="not-input">Not</label>
                  <input
                     id="not-input"
                     class="input"
                     type="text"
                     v-model="notLetters"
                     @input="syncState"
                     maxlength="25"
                  />
               </div>
               <div class="input-div">
                  <label for="word-filter-input">Word</label>
                  <input
                     id="word-filter-input"
                     class="input"
                     type="text"
                     v-model="wordFilter"
                     maxlength="25"
                  />
               </div>
            </div>
         </div>
         <SearchResults
            :boardLetters="boardLettersUpperCase"
            :player="player"
            :theme="theme"
            :searchResults="searchResults"
            :boardPreviewCellSize="boardPreviewCellSize"
            :move="moveIndicator"
            :wordFilter="wordFilterDebounced"
            @add-to-history="addPlayToHistory"
         ></SearchResults>
      </div>
   </div>
</template>

<style>
   .layout {
      display: flex;
      height: 100dvh;
      gap: 8px;
      padding: max(8px, env(safe-area-inset-top)) calc(max(8px, env(safe-area-inset-right)) + 475px + 8px)
         max(8px, env(safe-area-inset-bottom)) calc(max(8px, env(safe-area-inset-left)) + 180px);
   }
   .menu-pane {
      width: 180px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      position: fixed;
      left: 0;
      top: 0;
      height: 100dvh;
      background: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      padding: 8px;
      border-right: 1px solid v-bind('theme.defaultText');
      border-radius: 0;
   }
   .app-title {
      margin: 0 0 12px 0;
   }
   .menu-links {
      display: flex;
      flex-direction: column;
      gap: 6px;
   }
   .menu-link {
      color: v-bind('theme.defaultText');
      text-decoration: none;
   }
   .menu-link:hover {
      text-decoration: underline;
      cursor: pointer;
   }
   .games-section {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
   }
   .games-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
   }
   .games-header h3 {
      margin: 0;
   }
   .new-game-btn {
      background: transparent;
      border: 1px solid v-bind('theme.defaultText');
      color: v-bind('theme.defaultText');
      font-size: 18px;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
   }
   .new-game-btn:hover {
      background: v-bind('theme.defaultColor');
   }
   .games-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
      flex: 1 1 auto;
      min-height: 0;
      padding-right: 4px;
      scrollbar-color: v-bind('theme.defaultText') transparent;
   }
   .game-item {
      position: relative;
      padding: 6px;
      border: 2px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      transition: border-color 0.15s ease;
   }
   .game-item:hover {
      border-color: v-bind('theme.defaultText');
   }
   .game-item.selected {
      border-color: v-bind('theme.blue');
      background: v-bind('theme.defaultColor');
   }
   .game-item.dragging {
      opacity: 0.6;
      border-color: v-bind('theme.blue');
   }
   .delete-game-btn {
      position: absolute;
      top: 2px;
      right: 2px;
      background: v-bind('theme.red');
      border: none;
      color: v-bind('theme.defaultText');
      font-size: 14px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      line-height: 1;
   }
   .game-item:hover .delete-game-btn {
      display: flex;
   }
   .left-pane {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      min-height: 0;
   }
   .right-pane {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      min-height: 0;
      width: 475px;
      position: fixed;
      right: 0;
      top: 0;
      height: 100dvh;
      background: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      padding: 8px;
      border-left: 1px solid v-bind('theme.defaultText');
      border-radius: 0;
   }
   .history-grid {
      flex: 1 1 auto;
      min-height: 0;
   }
   h3,
   h4 {
      margin: 0;
      margin-bottom: 6px;
   }
   .input {
      width: 270px;
      margin-left: 2px;
      box-sizing: border-box;
      display: inline-block;
      padding: 2px 2px;
      background-color: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      height: 25px;
      font: inherit;
      border: 1px solid;
      border-radius: 4px;
   }
   .uppercase {
      text-transform: uppercase;
   }
   .input-div {
      width: 330px;
      display: flex;
      align-items: flex-end;
      justify-content: right;
      padding-bottom: 8px;
   }
   label {
      margin-right: 4px;
   }
   .board-edit {
      padding-top: 4px;
   }
   .page-input {
      width: 50px;
   }
   .move-cell-wrapper {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      height: 100%;
   }
   .move-cell {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid v-bind('theme.defaultText');
   }
   .filters-section {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
   }
   .filters-toggle {
      background: transparent;
      color: v-bind('theme.defaultText');
      border: none;
      font: inherit;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding-bottom: 8px;
   }
   .filters-toggle::before {
      content: '▸';
      display: inline-block;
      transform-origin: center;
      transition: transform 0.2s ease;
   }
   .filters-toggle[aria-expanded='true']::before {
      transform: rotate(90deg);
   }
   .history-grid {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   .results-grid {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
   }
   .pager {
      display: flex;
      gap: 20px;
      justify-content: right;
   }
   .pager-right {
      display: flex;
      gap: 8px;
      align-items: center;
   }
   .pager-select {
      border: 1px solid v-bind('theme.defaultColor2');
      background: v-bind('theme.defaultColor2');
      color: v-bind('theme.defaultText');
      border-radius: 4px;
      padding: 2px 6px;
      font: inherit;
   }
   .pager button {
      color: v-bind('theme.defaultText');
   }
   /* Scroll container provides the scrollbar and outer border */
   .table-container {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 6px;
      scrollbar-color: v-bind('theme.defaultText') transparent;
   }
   /* Table styling to mimic ag-grid header and column separators */
   .results-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
   }
   .results-table thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: v-bind('theme.blue');
      color: v-bind('theme.defaultText');
      font-weight: 600;
      padding: 8px 10px;
      border-right: 1px solid v-bind('theme.defaultText');
      border-bottom: 1px solid v-bind('theme.defaultText');
      white-space: nowrap;
   }
   .results-table thead th:last-child {
      border-right: none;
   }
   .results-table tbody td {
      padding: 6px 8px;
      vertical-align: middle;
   }
   .results-table tbody td button {
      background: transparent;
      color: v-bind('theme.defaultText');
      cursor: pointer;
   }
   .results-table tbody td:last-child {
      border-right: none;
   }
   .results-table tbody tr {
      background: v-bind('theme.defaultColor');
   }
   .results-table tbody tr:nth-child(even) {
      background: v-bind('theme.defaultColor2');
   }
   .pager button {
      border: none;
      background: transparent;
      padding: 4px 4px;
      cursor: pointer;
   }
   .pager button:disabled {
      opacity: 0.6;
      cursor: default;
   }
   .results-table tbody tr.selected {
      background: v-bind('theme.blue');
   }
   /* Modal styles */
   .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
   }
   .modal-content {
      background: v-bind('theme.defaultColor');
      color: v-bind('theme.defaultText');
      border: 1px solid v-bind('theme.defaultText');
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      max-width: 90vw;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
   }
   .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
   }
   .modal-header h2 {
      margin: 0;
   }
   .modal-close {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: v-bind('theme.defaultText');
      padding: 0 4px;
      line-height: 1;
   }
   .modal-close:hover {
      opacity: 0.7;
   }
   .modal-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
   }

   @media (max-width: 1150px) {
      .menu-pane {
         width: 100%;
         flex: 0 0 auto;
         position: static;
         height: auto;
         border-right: none;
         border: 1px solid v-bind('theme.defaultText');
         border-radius: 6px;
      }
      .games-list {
         flex-direction: row;
         overflow-x: auto;
         overflow-y: hidden;
         padding-right: 0;
         padding-bottom: 4px;
      }
      .left-pane,
      .right-pane {
         flex: 0 0 auto;
         width: 100%;
         position: static; /* Remove fixed positioning */
         height: auto; /* Remove fixed height */
         border-left: none; /* Remove border-left */
         background: transparent; /* Remove background */
         padding: 0; /* Remove padding */
      }
      .results-grid {
         flex: 0 0 auto;
      }
      .table-container {
         flex: 0 0 auto;
         max-height: 380px;
         overflow: auto;
      }
      .layout {
         flex-direction: column;
         height: auto;
         width: 100%;
         padding-left: max(8px, env(safe-area-inset-left));
         padding-right: max(8px, env(safe-area-inset-right)); /* Adjust padding for mobile */
      }
      .left-pane {
         width: 100%;
      }
      .right-pane {
         width: 100%;
      }
      .history-grid {
         flex: 0 0 auto;
      }
   }
</style>
