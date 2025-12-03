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
   import GamesSidebar from './GamesSidebar.vue';
   import SettingsModal from './SettingsModal.vue';
   import BoardEditor from './BoardEditor.vue';
   import SearchFilters from './SearchFilters.vue';
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

   const availableWordLists = [
      { value: 'en', label: 'All words' },
      { value: 'reduced', label: 'Common words' },
   ];
   const wordListSelected = ref<string>('en');
   const useBadWords = ref<boolean>(false);
   watch(wordListSelected, async () => {
      saveToLocalStorage();
      await reloadWordList();
   });
   watch(useBadWords, async () => {
      saveToLocalStorage();
      await reloadWordList();
   });
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
   const showSettings = ref(false);
   const boardEditorRef = ref<InstanceType<typeof BoardEditor> | null>(null);
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

   interface StoredGameState {
      historyList: HistoryEntry[];
      selectedHistoryIndex: number | null;
      moveIndicator: number;
      id: string;
      createdAt: number;
   }

   interface AppState {
      theme: ThemeName;
      wordList: string;
      useBadWords: boolean;
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
         wordList: wordListSelected.value,
         useBadWords: useBadWords.value,
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
               // Ensure wordList has a valid default
               if (
                  !parsed.wordList ||
                  !availableWordLists.some((wl) => wl.value === parsed.wordList)
               ) {
                  parsed.wordList = 'en';
               }
               // Ensure useBadWords has a valid default
               if (typeof parsed.useBadWords !== 'boolean') {
                  parsed.useBadWords = false;
               }
               return parsed;
            }
         }
      } catch (e) {
         console.warn('Failed to load state from local storage:', e);
      }
      return null;
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
      if (boardEditorRef.value) {
         boardEditorRef.value.setShowBoardEdit(boardLetters.value.length !== 25);
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
      const defaultColors = useDefault ? 'BBBBBBBBBBBWWWrrRRRRRrrRR' : '';
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

   function reorderGames(fromIndex: number, toIndex: number) {
      const [movedGame] = games.value.splice(fromIndex, 1);
      games.value.splice(toIndex, 0, movedGame!);
      saveToLocalStorage();
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

      let wordList: string[] = await getWordList(wordListSelected.value, useBadWords.value);
      player.value = markRaw(new Player(undefined, undefined, wordList));
      if (import.meta.env.DEV) window.player = player; //for console debug purposes

      // Load app state from local storage
      const storedState = loadFromLocalStorage();
      if (storedState) {
         themeSelected.value = storedState.theme;
         wordListSelected.value = storedState.wordList;
         useBadWords.value = storedState.useBadWords;
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

   async function getWordList(listName: string = 'en', includeBadWords: boolean = false) {
      let wordList: string[] = [];
      try {
         const response = await fetch(new URL(`word_lists/${listName}.txt`, document.baseURI));
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         const textData = await response.text();
         wordList = textData
            .toUpperCase()
            .split(/\r?\n/)
            .filter((word) => word.trim());

         if (includeBadWords) {
            const badWordsResponse = await fetch(
               new URL('word_lists/offensive.txt', document.baseURI)
            );
            if (badWordsResponse.ok) {
               const badWordsText = await badWordsResponse.text();
               const badWords = badWordsText
                  .toUpperCase()
                  .split(/\r?\n/)
                  .filter((word) => word.trim());
               wordList = [...wordList, ...badWords];
            }
         }
      } catch (error) {
         console.error('Failed to load word list:', error);
      }
      return wordList;
   }

   async function reloadWordList() {
      const wordList = await getWordList(wordListSelected.value, useBadWords.value);
      player.value = markRaw(new Player(undefined, undefined, wordList));
      if (import.meta.env.DEV) window.player = player;
      // Recalculate scores for current game
      if (player.value && boardLetters.value.length === 25) {
         player.value.possible(boardLettersUpperCase.value);
         for (const h of historyList.value) {
            const s: Score = convertBoardScore(h.colors.toUpperCase());
            h.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
         }
         const idx = selectedHistoryIndex.value ?? historyList.value.length - 1;
         const played = historyList.value.slice(1, idx + 1).map((a) => a.text);
         player.value.resetplayed(boardLettersUpperCase.value, played);
         runSearch();
      }
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
   <SettingsModal
      v-if="showSettings"
      :theme="theme"
      :themeSelected="themeSelected"
      :availableThemes="availableThemes"
      :wordListSelected="wordListSelected"
      :availableWordLists="availableWordLists"
      :useBadWords="useBadWords"
      @close="showSettings = false"
      @update:themeSelected="themeSelected = $event as ThemeName"
      @update:wordListSelected="wordListSelected = $event"
      @update:useBadWords="useBadWords = $event"
   />

   <div class="layout">
      <GamesSidebar
         :games="games"
         :selectedGameId="selectedGameId"
         :theme="theme"
         :previewCellSize="navPreviewCellSize"
         @select-game="selectGame"
         @create-game="createNewGame(false)"
         @delete-game="deleteGame"
         @reorder-games="reorderGames"
         @open-settings="showSettings = true"
      />
      <div class="left-pane">
         <div class="board-container">
            <BoardGrid
               :letters="boardLettersUpperCase"
               :colors="boardColorsDefended"
               :theme="theme"
               :size="70"
            />
            <BoardEditor
               ref="boardEditorRef"
               :theme="theme"
               :moveIndicator="moveIndicator"
               :boardLetters="boardLetters"
               :colorLetters="colorLetters"
               @update:moveIndicator="
                  moveIndicator = $event;
                  syncState();
               "
               @update:boardLetters="
                  boardLetters = $event;
                  clearHistorySyncState();
               "
               @update:colorLetters="
                  colorLetters = $event;
                  clearHistorySyncState();
               "
            />
         </div>
         <HistoryTable
            :historyList="historyList"
            :boardLetters="boardLettersUpperCase"
            :theme="theme"
            :boardPreviewCellSize="boardPreviewCellSize"
            :selectedIndex="selectedHistoryIndex"
            @row-click="onHistoryRowClicked"
         />
      </div>
      <div class="right-pane">
         <h3>Search Results</h3>
         <SearchFilters
            :theme="theme"
            :needLetters="needLetters"
            :notLetters="notLetters"
            :wordFilter="wordFilter"
            @update:needLetters="
               needLetters = $event;
               syncState();
            "
            @update:notLetters="
               notLetters = $event;
               syncState();
            "
            @update:wordFilter="wordFilter = $event"
         />
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
      padding: max(8px, env(safe-area-inset-top))
         calc(max(8px, env(safe-area-inset-right)) + 475px + 8px)
         max(8px, env(safe-area-inset-bottom)) calc(max(8px, env(safe-area-inset-left)) + 180px);
   }
   .left-pane {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      min-height: 0;
   }
   .board-container {
      display: flex;
      flex-direction: column;
      align-items: center;
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
      color: v-bind('theme.defaultText');
      padding: 8px;
   }
   h3,
   h4 {
      margin: 0;
      margin-bottom: 6px;
   }

   @media (max-width: 1150px) {
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
