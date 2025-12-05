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
   import { onKeyStroke, useActiveElement } from '@vueuse/core';
   import BoardGrid from './BoardGrid.vue';
   import SearchResults from './SearchResults.vue';
   import HistoryTree from './HistoryTree.vue';
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
   import {
      type HistoryTree as HistoryTreeType,
      type HistoryNode,
      createEmptyTree,
      createRootNode,
      createMoveNode,
      addNodeToTree,
      getPathToNode,
      serializeTreeToHash,
      parseHashToTree,
      treeToArray,
      arrayToTree,
      resetNodeIdCounter,
   } from '../ts/historyTree';

   const activeElement = useActiveElement();
   const isInputFocused = computed(() => activeElement.value?.tagName === 'INPUT');

   const themes = new Themes();
   const themeSelected = ref<ThemeName>('Light');
   const theme = computed<ThemeConfig>(() => themes[themeSelected.value]);
   const themeVars = computed(() => ({
      '--theme-blue': theme.value.blue,
      '--theme-blue-text': theme.value.blueText,
      '--theme-defended-blue': theme.value.defendedBlue,
      '--theme-defended-blue-text': theme.value.defendedBlueText,
      '--theme-red': theme.value.red,
      '--theme-red-text': theme.value.redText,
      '--theme-defended-red': theme.value.defendedRed,
      '--theme-defended-red-text': theme.value.defendedRedText,
      '--theme-default-color': theme.value.defaultColor,
      '--theme-default-color2': theme.value.defaultColor2,
      '--theme-default-text': theme.value.defaultText,
   }));
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
   onKeyStroke('t', () => {
      if (!isInputFocused.value) {
         const themeIdx = availableThemes.indexOf(themeSelected.value);
         themeSelected.value = availableThemes[(themeIdx + 1) % availableThemes.length]!;
      }
   });

   const availableWordLists = [
      { value: 'en', label: 'All words' },
      { value: 'reduced', label: 'Common words' },
   ];
   const wordListSelected = ref<string>('en');
   onKeyStroke('w', () => {
      if (!isInputFocused.value) {
         if (wordListSelected.value === 'en') {
            wordListSelected.value = 'reduced';
         } else {
            wordListSelected.value = 'en';
         }
      }
   });
   const useBadWords = ref<boolean>(false);
   watch(wordListSelected, async () => {
      saveToLocalStorage();
      await reloadWordList();
   });
   watch(useBadWords, async () => {
      saveToLocalStorage();
      await reloadWordList();
   });

   const showSettings = ref(false);
   onKeyStroke(
      's',
      () => {
         if (!isInputFocused.value) {
            showSettings.value = !showSettings.value;
         }
      },
      { passive: true }
   );
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
   const historyTree: Ref<HistoryTreeType> = shallowRef(createEmptyTree());
   const selectedNodeId: Ref<string | null> = ref(null);
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
      isMobile.value = window.innerWidth <= 900;
   }
   const LOCAL_STORAGE_KEY = 'concentrate-state';
   const games: Ref<StoredGameState[]> = ref([]);
   const selectedGameId: Ref<string | null> = ref(null);

   interface StoredGameState {
      historyNodes: HistoryNode[];
      selectedNodeId: string | null;
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
            historyNodes: treeToArray(historyTree.value),
            selectedNodeId: selectedNodeId.value,
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
      historyTree.value = arrayToTree(game.historyNodes);
      selectedNodeId.value = game.selectedNodeId;
      moveIndicator.value = game.moveIndicator;

      // Extract board letters from root node
      const rootNode = historyTree.value.nodes.get(historyTree.value.rootId);
      if (rootNode && rootNode.type === 0) {
         boardLetters.value = rootNode.text.toUpperCase();
      } else {
         boardLetters.value = '';
      }

      // Set color letters from selected node or find the last node in main line
      let selectedNode: HistoryNode | undefined;
      if (selectedNodeId.value) {
         selectedNode = historyTree.value.nodes.get(selectedNodeId.value);
      }
      if (!selectedNode) {
         // Find last node in main line (follow first children)
         let current = rootNode;
         while (current && current.childIds.length > 0) {
            current = historyTree.value.nodes.get(current.childIds[0]!);
         }
         selectedNode = current;
      }
      if (selectedNode) {
         colorLetters.value = selectedNode.colors;
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
         for (const node of historyTree.value.nodes.values()) {
            const s: Score = convertBoardScore(node.colors.toUpperCase());
            node.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
         }
         // Get path to selected node for resetplayed
         const path = selectedNode ? getPathToNode(historyTree.value, selectedNode.id) : [];
         const played = path.slice(1).map((n) => n.text);
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

      // Create tree with root node
      resetNodeIdCounter(0);
      const rootNode = createRootNode(defaultBoard, defaultColors, 0);
      const tree = createEmptyTree();
      addNodeToTree(tree, rootNode);

      const newGame: StoredGameState = {
         id: newId,
         createdAt: Date.now(),
         historyNodes: treeToArray(tree),
         selectedNodeId: null,
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

      if (rawHash) {
         // Try new format first: {id}-{parentId}-{type}-{text}-{colors}.
         const tree = parseHashToTree(rawHash);

         if (tree.rootId && tree.nodes.size > 0) {
            historyTree.value = tree;

            const rootNode = tree.nodes.get(tree.rootId);
            if (rootNode && rootNode.type === 0 && rootNode.text.length === 25) {
               boardLetters.value = rootNode.text.toUpperCase();
            }

            // Find selected node
            let selectedNode: HistoryNode | undefined;
            if (selected && tree.nodes.has(selected)) {
               selectedNode = tree.nodes.get(selected);
               selectedNodeId.value = selected;
            } else {
               // Default to last node in main line
               let current = rootNode;
               while (current && current.childIds.length > 0) {
                  current = tree.nodes.get(current.childIds[0]!);
               }
               selectedNode = current;
               selectedNodeId.value = selectedNode?.id ?? null;
            }

            if (selectedNode) {
               colorLetters.value = selectedNode.colors;
               if (selectedNode.type === 0) {
                  // Root node - check first child for move indicator
                  const firstChild = selectedNode.childIds[0]
                     ? tree.nodes.get(selectedNode.childIds[0])
                     : null;
                  moveIndicator.value = firstChild?.type ?? 1;
               } else {
                  moveIndicator.value = -selectedNode.type;
               }
            }

            if (player.value) {
               player.value.possible(boardLettersUpperCase.value);
               for (const node of tree.nodes.values()) {
                  const s: Score = convertBoardScore(node.colors.toUpperCase());
                  node.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
               }
               const path = selectedNode ? getPathToNode(tree, selectedNode.id) : [];
               const played = path.slice(1).map((n) => n.text);
               player.value.resetplayed(boardLettersUpperCase.value, played);
            }

            return gameId;
         }
      }
      return null;
   }

   function updateQueryParams() {
      const params = new URLSearchParams();
      if (selectedGameId.value) params.set('id', selectedGameId.value);
      if (selectedNodeId.value !== null) params.set('selected', selectedNodeId.value);
      const historyFragment = serializeTreeToHash(historyTree.value);
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
            existingGame.historyNodes = treeToArray(historyTree.value);
            existingGame.selectedNodeId = selectedNodeId.value;
            existingGame.moveIndicator = moveIndicator.value;
         } else {
            // Create new game from URL data
            const newId = urlGameId || generateGameId();
            const newGame: StoredGameState = {
               id: newId,
               createdAt: Date.now(),
               historyNodes: treeToArray(historyTree.value),
               selectedNodeId: selectedNodeId.value,
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
      let score = 0;
      if (player.value) {
         player.value.possible(boardLettersUpperCase.value);
         let s: Score = convertBoardScore(boardColorsDefended.value);
         score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 2);
      }

      resetNodeIdCounter(0);
      const rootNode = createRootNode(
         boardLettersUpperCase.value,
         boardColorsDefended.value,
         score
      );
      const tree = createEmptyTree();
      addNodeToTree(tree, rootNode);
      historyTree.value = tree;
      selectedNodeId.value = null;
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
         for (const node of historyTree.value.nodes.values()) {
            const s: Score = convertBoardScore(node.colors.toUpperCase());
            node.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
         }
         // Get path to selected node
         let selectedNode: HistoryNode | undefined;
         if (selectedNodeId.value) {
            selectedNode = historyTree.value.nodes.get(selectedNodeId.value);
         }
         if (!selectedNode) {
            // Find last node in main line
            let current = historyTree.value.nodes.get(historyTree.value.rootId);
            while (current && current.childIds.length > 0) {
               current = historyTree.value.nodes.get(current.childIds[0]!);
            }
            selectedNode = current;
         }
         const path = selectedNode ? getPathToNode(historyTree.value, selectedNode.id) : [];
         const played = path.slice(1).map((n) => n.text);
         player.value.resetplayed(boardLettersUpperCase.value, played);
         runSearch();
      }
   }

   function addPlayToHistory(play: Play) {
      const colors = mapsToColors(play.blue_map, play.red_map);
      const word = (play.word ?? '').toUpperCase();
      const score = play.score ?? 0;

      // Determine parent node
      let parentId: string;
      if (selectedNodeId.value !== null) {
         parentId = selectedNodeId.value;
      } else {
         // Find last node in main line to use as parent
         let current = historyTree.value.nodes.get(historyTree.value.rootId);
         while (current && current.childIds.length > 0) {
            current = historyTree.value.nodes.get(current.childIds[0]!);
         }
         parentId = current?.id ?? historyTree.value.rootId;
      }

      // Create new node and add to tree
      const newNode = createMoveNode(moveIndicator.value, word, colors, score, parentId);
      addNodeToTree(historyTree.value, newNode);

      // Trigger reactivity by creating new tree reference
      historyTree.value = { ...historyTree.value, nodes: new Map(historyTree.value.nodes) };

      player.value!.playword(boardLettersUpperCase.value, word);
      selectedNodeId.value = newNode.id;
      colorLetters.value = colors;
      moveIndicator.value = -moveIndicator.value;
      searchResults.value = [];
      needLetters.value = '';
      notLetters.value = '';
      wordFilter.value = '';
      syncState();
   }

   function deleteNodeAndChildren(nodeId: string): void {
      const node = historyTree.value.nodes.get(nodeId);
      if (!node) return;

      // Recursively delete all children first
      for (const childId of [...node.childIds]) {
         deleteNodeAndChildren(childId);
      }

      // Remove this node from parent's childIds
      if (node.parentId) {
         const parent = historyTree.value.nodes.get(node.parentId);
         if (parent) {
            const idx = parent.childIds.indexOf(nodeId);
            if (idx !== -1) {
               parent.childIds.splice(idx, 1);
            }
         }
      }

      // Remove node from tree
      historyTree.value.nodes.delete(nodeId);
   }

   function onHistoryNodeDelete(node: HistoryNode) {
      // Don't allow deleting root node
      if (node.type === 0) return;

      const parentId = node.parentId;

      // If selected node is being deleted or is a descendant, move selection to parent
      if (selectedNodeId.value) {
         const path = getPathToNode(historyTree.value, selectedNodeId.value);
         const isSelectedOrDescendant = path.some((n) => n.id === node.id);
         if (isSelectedOrDescendant) {
            selectedNodeId.value = parentId;
            const parentNode = parentId ? historyTree.value.nodes.get(parentId) : null;
            if (parentNode) {
               colorLetters.value = parentNode.colors;
               if (parentNode.type === 0) {
                  const firstChild = parentNode.childIds[0]
                     ? historyTree.value.nodes.get(parentNode.childIds[0])
                     : null;
                  moveIndicator.value = firstChild?.type ?? 1;
               } else {
                  moveIndicator.value = -parentNode.type;
               }
            }
         }
      }

      // Delete the node and all its children
      deleteNodeAndChildren(node.id);

      // Trigger reactivity
      historyTree.value = { ...historyTree.value, nodes: new Map(historyTree.value.nodes) };

      // Reset player state
      if (player.value && selectedNodeId.value) {
         const path = getPathToNode(historyTree.value, selectedNodeId.value);
         const played = path.slice(1).map((n) => n.text);
         player.value.resetplayed(boardLettersUpperCase.value, played);
      }

      syncState();
   }

   function onHistoryNodeClicked(node: HistoryNode) {
      selectedNodeId.value = node.id;
      colorLetters.value = node.colors;

      // If the node is root (type 0), check first child for move indicator
      if (node.type === 0) {
         const firstChild = node.childIds[0] ? historyTree.value.nodes.get(node.childIds[0]) : null;
         moveIndicator.value = firstChild?.type ?? 1;
      } else {
         moveIndicator.value = -node.type;
      }

      // Reset played words to path up to this node
      const path = getPathToNode(historyTree.value, node.id);
      const played = path.slice(1).map((n) => n.text);
      player.value?.resetplayed(boardLettersUpperCase.value, played);

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

   <div class="layout" :style="themeVars">
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
         <HistoryTree
            :historyTree="historyTree"
            :boardLetters="boardLettersUpperCase"
            :theme="theme"
            :boardPreviewCellSize="boardPreviewCellSize"
            :selectedNodeId="selectedNodeId"
            @node-click="onHistoryNodeClicked"
            @node-delete="onHistoryNodeDelete"
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
      width: 100%;
   }
   .left-pane {
      display: flex;
      flex: 1 1 auto;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
      min-height: 0;
      width: 50%;
      height: 100dvh;
      padding: 6px;
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
      width: 50%;
      height: 100dvh;
      color: var(--theme-default-text);
      padding: 6px;
   }
   h3,
   h4 {
      margin: 0;
      margin-bottom: 6px;
   }

   @media (max-width: 900px) {
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
