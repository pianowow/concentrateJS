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
      type ThemeConfig,
      Themes,
      mapsToColors,
      Score,
      convertBoardScore,
      reducedColors,
   } from '../ts/board';
   import { roundTo, strCount } from '../ts/util';
   import {
      type HistoryNode,
      arrayToTree,
      createEmptyTree,
      createRootNode,
      createMoveNode,
      addNodeToTree,
      getPathToNode,
      serializeTreeToHash,
      parseHashToTree,
      treeToArray,
      resetNodeIdCounter,
   } from '../ts/historyTree';
   import type { StoredGameState, ThemeName } from '@/ts/types';
   import { useAnalysisStore } from '../stores/analysisStore';

   const analysisStore = useAnalysisStore();

   const activeElement = useActiveElement();
   const isInputFocused = computed(() => activeElement.value?.tagName === 'INPUT');

   const themes = new Themes();
   const theme = computed<ThemeConfig>(() => themes[analysisStore.themeSelected]);
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
   const availableThemes = Object.keys(themes) as ThemeName[];
   onKeyStroke('t', () => {
      if (!isInputFocused.value) {
         const themeIdx = availableThemes.indexOf(analysisStore.themeSelected);
         analysisStore.themeSelected = availableThemes[(themeIdx + 1) % availableThemes.length]!;
      }
   });

   const availableWordLists = [
      { value: 'en', label: 'All words' },
      { value: 'reduced', label: 'Common words' },
   ];
   onKeyStroke('w', () => {
      if (!isInputFocused.value) {
         if (analysisStore.wordListSelected === 'en') {
            analysisStore.wordListSelected = 'reduced';
         } else {
            analysisStore.wordListSelected = 'en';
         }
      }
   });
   watch(
      () => analysisStore.wordListSelected,
      async () => {
         analysisStore.saveToLocalStorage();
         await reloadWordList();
      }
   );
   watch(
      () => analysisStore.useBadWords,
      async () => {
         analysisStore.saveToLocalStorage();
         await reloadWordList();
      }
   );

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
   const hideLosingPlays = ref(false);
   const searchResults: Ref<Play[]> = shallowRef<Play[]>([]);
   let player: Ref<Player>;
   const boardPreviewCellSize = 9;
   const isMobile = ref(false);
   const navPreviewCellSize = computed(() => (isMobile.value ? 9 : 25));

   function updateIsMobile() {
      isMobile.value = window.innerWidth <= 900;
   }

   function selectGame(gameId: string) {
      if (analysisStore.selectedGameId === gameId) return;
      analysisStore.updateCurrentGameInArray();
      const game = analysisStore.games.find((g) => g.id === gameId);
      if (game) {
         analysisStore.selectedGameId = gameId;
         loadGameState(game);
         analysisStore.saveToLocalStorage();
         updateQueryParams();
         runSearch();
      }
   }

   function loadGameState(game: StoredGameState) {
      analysisStore.historyTree = arrayToTree(game.historyNodes);
      analysisStore.selectedNodeId = game.selectedNodeId;
      analysisStore.moveIndicator = game.moveIndicator;

      // Extract board letters from root node
      const rootNode = analysisStore.historyTree.nodes.get(analysisStore.historyTree.rootId);
      if (rootNode && rootNode.type === 0) {
         boardLetters.value = rootNode.text.toUpperCase();
      } else {
         boardLetters.value = '';
      }

      // Set color letters from selected node or find the last node in main line
      let selectedNode: HistoryNode | undefined;
      if (analysisStore.selectedNodeId) {
         selectedNode = analysisStore.historyTree.nodes.get(analysisStore.selectedNodeId);
      }
      if (!selectedNode) {
         // Find last node in main line (follow first children)
         let current = rootNode;
         while (current && current.childIds.length > 0) {
            current = analysisStore.historyTree.nodes.get(current.childIds[0]!);
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
      player.value.possible(boardLettersUpperCase.value);
      for (const node of analysisStore.historyTree.nodes.values()) {
         const s: Score = convertBoardScore(node.colors.toUpperCase());
         node.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
      }
      // Get path to selected node for resetplayed
      const path = selectedNode ? getPathToNode(analysisStore.historyTree, selectedNode.id) : [];
      const played = path.slice(1).map((n) => n.text);
      player.value.resetplayed(boardLettersUpperCase.value, played);
   }

   function generateGameId(): string {
      return `game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
   }

   function createNewGame(useDefault: boolean = false) {
      analysisStore.updateCurrentGameInArray();
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
      analysisStore.games.push(newGame);
      analysisStore.selectedGameId = newId;
      loadGameState(newGame);
      analysisStore.saveToLocalStorage();
      updateQueryParams();
      runSearch();
   }
   function deleteGame(gameId: string) {
      const idx = analysisStore.games.findIndex((g) => g.id === gameId);
      if (idx === -1) return;
      analysisStore.games.splice(idx, 1);

      if (analysisStore.selectedGameId === gameId) {
         if (analysisStore.games.length > 0) {
            // Select another game (prefer the one at same index, or last one)
            const newIdx = Math.min(idx, analysisStore.games.length - 1);
            const newGame = analysisStore.games[newIdx]!;
            analysisStore.selectedGameId = newGame.id;
            loadGameState(newGame);
         } else {
            // No games left, create a new default one
            createNewGame();
            return;
         }
      }
      analysisStore.saveToLocalStorage();
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
            analysisStore.historyTree = tree;

            const rootNode = tree.nodes.get(tree.rootId);
            if (rootNode && rootNode.type === 0 && rootNode.text.length === 25) {
               boardLetters.value = rootNode.text.toUpperCase();
            }

            // Find selected node
            let selectedNode: HistoryNode | undefined;
            if (selected && tree.nodes.has(selected)) {
               selectedNode = tree.nodes.get(selected);
               analysisStore.selectedNodeId = selected;
            } else {
               // Default to last node in main line
               let current = rootNode;
               while (current && current.childIds.length > 0) {
                  current = tree.nodes.get(current.childIds[0]!);
               }
               selectedNode = current;
               analysisStore.selectedNodeId = selectedNode?.id ?? null;
            }

            if (selectedNode) {
               colorLetters.value = selectedNode.colors;
               if (selectedNode.type === 0) {
                  // Root node - check first child for move indicator
                  const firstChild = selectedNode.childIds[0]
                     ? tree.nodes.get(selectedNode.childIds[0])
                     : null;
                  analysisStore.moveIndicator = firstChild?.type ?? 1;
               } else {
                  analysisStore.moveIndicator = -selectedNode.type;
               }
            }

            player.value.possible(boardLettersUpperCase.value);
            for (const node of tree.nodes.values()) {
               const s: Score = convertBoardScore(node.colors.toUpperCase());
               node.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
            }
            const path = selectedNode ? getPathToNode(tree, selectedNode.id) : [];
            const played = path.slice(1).map((n) => n.text);
            player.value.resetplayed(boardLettersUpperCase.value, played);

            return gameId;
         }
      }
      return null;
   }

   function updateQueryParams() {
      const params = new URLSearchParams();
      if (analysisStore.selectedGameId) params.set('id', analysisStore.selectedGameId);
      if (analysisStore.selectedNodeId !== null)
         params.set('selected', analysisStore.selectedNodeId);
      const historyFragment = serializeTreeToHash(analysisStore.historyTree);
      const newUrl = `${window.location.pathname}?${params.toString()}#${historyFragment}`;
      history.replaceState(null, '', newUrl);
   }

   // Debounce state for searches
   let searchDebounceHandle: number | undefined;
   const DEBOUNCE_MS = 400;

   onMounted(async () => {
      updateIsMobile();
      window.addEventListener('resize', updateIsMobile);

      let wordList: string[] = await getWordList(
         analysisStore.wordListSelected,
         analysisStore.useBadWords
      );
      player = shallowRef<Player>(markRaw(new Player(undefined, undefined, wordList)));
      if (import.meta.env.DEV) window.player = player; //for console debug purposes

      // Load app state from local storage
      // TODO move this logic to analysisStore
      const storedState = analysisStore.loadFromLocalStorage();
      if (storedState) {
         // Ensure wordList has a valid default
         if (
            !storedState.wordList ||
            !availableWordLists.some((wl) => wl.value === storedState.wordList)
         ) {
            storedState.wordList = 'en';
         }
         // Ensure useBadWords has a valid default
         if (typeof storedState.useBadWords !== 'boolean') {
            storedState.useBadWords = false;
         }
         // Ensure page sizes have a value
         if (typeof storedState.historyTreePageSize !== 'number') {
            storedState.historyTreePageSize = 20;
         }
         if (typeof storedState.searchResultsPageSize !== 'number') {
            storedState.searchResultsPageSize = 20;
         }
         analysisStore.themeSelected = storedState.theme;
         analysisStore.wordListSelected = storedState.wordList;
         analysisStore.useBadWords = storedState.useBadWords;
         analysisStore.games = storedState.games;
         analysisStore.selectedGameId = storedState.selectedGameId;
         analysisStore.historyTreePageSize = storedState.historyTreePageSize;
         analysisStore.searchResultsPageSize = storedState.searchResultsPageSize;
      } else {
         // Set theme based on system preference
         const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
         analysisStore.themeSelected = prefersDark ? 'Dark' : 'Light';
      }

      // Check for URL params first (they override local storage)
      const urlGameId = readQueryParams();

      if (boardLetters.value) {
         // URL had game data - check if game ID exists in storage
         const existingGame = urlGameId
            ? analysisStore.games.find((g) => g.id === urlGameId)
            : null;
         if (existingGame) {
            // Update existing game with URL data
            analysisStore.selectedGameId = urlGameId;
            existingGame.historyNodes = treeToArray(analysisStore.historyTree);
            existingGame.selectedNodeId = analysisStore.selectedNodeId;
            existingGame.moveIndicator = analysisStore.moveIndicator;
         } else {
            // Create new game from URL data
            // TODO move this logic to analysisStore
            const newId = urlGameId || generateGameId();
            const newGame: StoredGameState = {
               id: newId,
               createdAt: Date.now(),
               historyNodes: treeToArray(analysisStore.historyTree),
               selectedNodeId: analysisStore.selectedNodeId,
               moveIndicator: analysisStore.moveIndicator,
            };
            analysisStore.games.push(newGame);
            analysisStore.selectedGameId = newId;
         }
      } else if (analysisStore.selectedGameId) {
         // Load selected game from storage
         const game = analysisStore.games.find((g) => g.id === analysisStore.selectedGameId);
         if (game) {
            loadGameState(game);
         } else if (analysisStore.games.length > 0) {
            // Selected game not found, load first game
            analysisStore.selectedGameId = analysisStore.games[0]!.id;
            loadGameState(analysisStore.games[0]!);
         } else {
            // First time user - create with default board
            createNewGame(true);
         }
      } else if (analysisStore.games.length > 0) {
         // No selection but games exist, select first
         analysisStore.selectedGameId = analysisStore.games[0]!.id;
         loadGameState(analysisStore.games[0]!);
      } else {
         // No games at all (first time user) - create with default board
         createNewGame(true);
      }

      analysisStore.saveToLocalStorage();
      updateQueryParams();
      runSearch();
   });

   function clearHistory() {
      let score = 0;
      player.value.possible(boardLettersUpperCase.value);
      let s: Score = convertBoardScore(boardColorsDefended.value);
      score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 2);

      resetNodeIdCounter(0);
      const rootNode = createRootNode(
         boardLettersUpperCase.value,
         reducedColors(boardColorsDefended.value),
         score
      );
      const tree = createEmptyTree();
      addNodeToTree(tree, rootNode);
      analysisStore.historyTree = tree;
      analysisStore.selectedNodeId = null;
   }

   function clearHistorySyncState() {
      clearHistory();
      syncState();
   }

   function syncState() {
      updateQueryParams();
      analysisStore.saveToLocalStorage();
      if (searchDebounceHandle) {
         clearTimeout(searchDebounceHandle);
      }
      searchDebounceHandle = window.setTimeout(() => {
         runSearch();
      }, DEBOUNCE_MS);
   }

   function runSearch() {
      if (boardLetters.value.length == 25 && strCount(boardColorsDefended.value, 'w') > 0) {
         const letters = boardLettersUpperCase.value;
         const colors = colorLettersUpperCase.value;
         const need = needLettersUpperCase.value;
         const not = notLettersUpperCase.value;
         const move = analysisStore.moveIndicator;
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
      const wordList = await getWordList(analysisStore.wordListSelected, analysisStore.useBadWords);
      player.value = markRaw(new Player(undefined, undefined, wordList));
      if (import.meta.env.DEV) window.player = player;
      // Recalculate scores for current game
      if (boardLetters.value.length === 25) {
         player.value.possible(boardLettersUpperCase.value);
         for (const node of analysisStore.historyTree.nodes.values()) {
            const s: Score = convertBoardScore(node.colors.toUpperCase());
            node.score = roundTo(player.value.evaluatePos(boardLettersUpperCase.value, s), 3);
         }
         // Get path to selected node
         let selectedNode: HistoryNode | undefined;
         if (analysisStore.selectedNodeId) {
            selectedNode = analysisStore.historyTree.nodes.get(analysisStore.selectedNodeId);
         }
         if (!selectedNode) {
            // Find last node in main line
            let current = analysisStore.historyTree.nodes.get(analysisStore.historyTree.rootId);
            while (current && current.childIds.length > 0) {
               current = analysisStore.historyTree.nodes.get(current.childIds[0]!);
            }
            selectedNode = current;
         }
         const path = selectedNode ? getPathToNode(analysisStore.historyTree, selectedNode.id) : [];
         const played = path.slice(1).map((n) => n.text);
         player.value.resetplayed(boardLettersUpperCase.value, played);
         runSearch();
      }
   }

   function addPlayToHistory(play: Play) {
      const colors = reducedColors(mapsToColors(play.blue_map, play.red_map));
      const word = (play.word ?? '').toUpperCase();
      const score = play.score ?? 0;

      // Determine parent node
      let parentId: string;
      if (analysisStore.selectedNodeId !== null) {
         parentId = analysisStore.selectedNodeId;
      } else {
         // Find last node in main line to use as parent
         let current = analysisStore.historyTree.nodes.get(analysisStore.historyTree.rootId);
         while (current && current.childIds.length > 0) {
            current = analysisStore.historyTree.nodes.get(current.childIds[0]!);
         }
         parentId = current?.id ?? analysisStore.historyTree.rootId;
      }

      // Create new node and add to tree
      const newNode = createMoveNode(analysisStore.moveIndicator, word, colors, score, parentId);
      addNodeToTree(analysisStore.historyTree, newNode);

      // Trigger reactivity by creating new tree reference
      analysisStore.historyTree = {
         ...analysisStore.historyTree,
         nodes: new Map(analysisStore.historyTree.nodes),
      };

      player.value.playword(boardLettersUpperCase.value, word);
      analysisStore.selectedNodeId = newNode.id;
      colorLetters.value = colors;
      analysisStore.moveIndicator = -analysisStore.moveIndicator;
      searchResults.value = [];
      needLetters.value = '';
      notLetters.value = '';
      wordFilter.value = '';

      updateQueryParams();
      analysisStore.saveToLocalStorage();
      runSearch();
   }

   function deleteNodeAndChildren(nodeId: string): void {
      const node = analysisStore.historyTree.nodes.get(nodeId);
      if (!node) return;

      // Recursively delete all children first
      for (const childId of [...node.childIds]) {
         deleteNodeAndChildren(childId);
      }

      // Remove this node from parent's childIds
      if (node.parentId) {
         const parent = analysisStore.historyTree.nodes.get(node.parentId);
         if (parent) {
            const idx = parent.childIds.indexOf(nodeId);
            if (idx !== -1) {
               parent.childIds.splice(idx, 1);
            }
         }
      }

      // Remove node from tree
      analysisStore.historyTree.nodes.delete(nodeId);
   }

   function onHistoryNodeDelete(node: HistoryNode) {
      // Don't allow deleting root node
      if (node.type === 0) return;

      const parentId = node.parentId;

      // If selected node is being deleted or is a descendant, move selection to parent
      if (analysisStore.selectedNodeId) {
         const path = getPathToNode(analysisStore.historyTree, analysisStore.selectedNodeId);
         const isSelectedOrDescendant = path.some((n) => n.id === node.id);
         if (isSelectedOrDescendant) {
            analysisStore.selectedNodeId = parentId;
            const parentNode = parentId ? analysisStore.historyTree.nodes.get(parentId) : null;
            if (parentNode) {
               colorLetters.value = parentNode.colors;
               if (parentNode.type === 0) {
                  const firstChild = parentNode.childIds[0]
                     ? analysisStore.historyTree.nodes.get(parentNode.childIds[0])
                     : null;
                  analysisStore.moveIndicator = firstChild?.type ?? 1;
               } else {
                  analysisStore.moveIndicator = -parentNode.type;
               }
            }
         }
      }

      // Delete the node and all its children
      deleteNodeAndChildren(node.id);

      // Trigger reactivity
      analysisStore.historyTree = {
         ...analysisStore.historyTree,
         nodes: new Map(analysisStore.historyTree.nodes),
      };

      // Reset player state
      if (analysisStore.selectedNodeId) {
         const path = getPathToNode(analysisStore.historyTree, analysisStore.selectedNodeId);
         const played = path.slice(1).map((n) => n.text);
         player.value.resetplayed(boardLettersUpperCase.value, played);
      }

      syncState();
   }

   function onHistoryNodeClicked(node: HistoryNode) {
      analysisStore.selectedNodeId = node.id;
      colorLetters.value = node.colors;

      // If the node is root (type 0), check first child for move indicator
      if (node.type === 0) {
         const firstChild = node.childIds[0]
            ? analysisStore.historyTree.nodes.get(node.childIds[0])
            : null;
         analysisStore.moveIndicator = firstChild?.type ?? 1;
      } else {
         analysisStore.moveIndicator = -node.type;
      }

      // Reset played words to path up to this node
      const path = getPathToNode(analysisStore.historyTree, node.id);
      const played = path.slice(1).map((n) => n.text);
      player.value.resetplayed(boardLettersUpperCase.value, played);

      updateQueryParams();
      analysisStore.saveToLocalStorage();
      runSearch();
   }

   onUnmounted(() => {
      window.removeEventListener('resize', updateIsMobile);
   });
</script>

<template>
   <div class="layout" :style="themeVars">
      <!-- Settings Modal -->
      <SettingsModal
         v-if="showSettings"
         :availableThemes="availableThemes"
         :availableWordLists="availableWordLists"
         @close="showSettings = false"
      />
      <GamesSidebar
         :games="analysisStore.games"
         :selectedGameId="analysisStore.selectedGameId"
         :previewCellSize="navPreviewCellSize"
         @open-settings="showSettings = true"
         @select-game="selectGame"
         @delete-game="deleteGame"
      />
      <div class="left-pane">
         <div class="board-container">
            <BoardGrid :letters="boardLettersUpperCase" :colors="boardColorsDefended" :size="60" />
            <BoardEditor
               ref="boardEditorRef"
               :theme="theme"
               :boardLetters="boardLetters"
               :colorLetters="colorLetters"
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
            :boardLetters="boardLettersUpperCase"
            :boardPreviewCellSize="boardPreviewCellSize"
            @node-click="onHistoryNodeClicked"
            @node-delete="onHistoryNodeDelete"
         />
      </div>
      <div class="right-pane">
         <h3>Search Results</h3>
         <SearchFilters
            :needLetters="needLetters"
            :notLetters="notLetters"
            :wordFilter="wordFilter"
            :hideLosingPlays="hideLosingPlays"
            @update:needLetters="
               needLetters = $event;
               syncState();
            "
            @update:notLetters="
               notLetters = $event;
               syncState();
            "
            @update:wordFilter="wordFilter = $event"
            @update:hideLosingPlays="hideLosingPlays = $event"
         />
         <SearchResults
            v-if="player"
            :boardLetters="boardLettersUpperCase"
            :player="player"
            :searchResults="searchResults"
            :boardPreviewCellSize="boardPreviewCellSize"
            :wordFilter="wordFilterDebounced"
            :hideLosingPlays="hideLosingPlays"
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
