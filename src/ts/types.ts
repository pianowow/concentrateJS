import type { HistoryNode, HistoryTree } from './historyTree';
import type { ThemeName } from './board';

export interface StoredGameState {
   historyNodes: HistoryNode[];
   selectedNodeId: string | null;
   moveIndicator: number;
   id: string;
   createdAt: number;
}

export interface AppState {
   theme: ThemeName;
   wordList: string;
   useBadWords: boolean;
   games: StoredGameState[];
   selectedGameId: string | null;
   historyTreePageSize: number;
   searchResultsPageSize: number;
}

export type { ThemeName, HistoryTree };
