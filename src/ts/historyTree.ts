// History Tree Data Structures and Utilities

export interface HistoryNode {
   id: string;
   type: number; // 1 blue, -1 red, 0 initial
   text: string; // word played or board letters
   colors: string;
   score: number;
   parentId: string | null;
   childIds: string[]; // ordered - first is "main line"
}

export interface HistoryTree {
   nodes: Map<string, HistoryNode>;
   rootId: string;
}

export interface FlattenedRow {
   node: HistoryNode;
   depth: number;
   isFirstInBranch: boolean;
}

let nextNodeId = 0;

export function generateNodeId(): string {
   return String(nextNodeId++);
}

export function resetNodeIdCounter(startFrom: number = 0): void {
   nextNodeId = startFrom;
}

export function createEmptyTree(): HistoryTree {
   return {
      nodes: new Map(),
      rootId: '',
   };
}

export function createRootNode(text: string, colors: string, score: number): HistoryNode {
   return {
      id: generateNodeId(),
      type: 0,
      text,
      colors,
      score,
      parentId: null,
      childIds: [],
   };
}

export function createMoveNode(
   type: number,
   text: string,
   colors: string,
   score: number,
   parentId: string
): HistoryNode {
   return {
      id: generateNodeId(),
      type,
      text,
      colors,
      score,
      parentId,
      childIds: [],
   };
}

export function addNodeToTree(tree: HistoryTree, node: HistoryNode): void {
   tree.nodes.set(node.id, node);

   if (node.parentId === null) {
      tree.rootId = node.id;
   } else {
      const parent = tree.nodes.get(node.parentId);
      if (parent) {
         // Add as last child (will be alternate if parent already has children)
         parent.childIds.push(node.id);
      }
   }
}

export function insertMainLineNode(tree: HistoryTree, node: HistoryNode): void {
   // Insert as FIRST child (main line), pushing existing children to alternates
   tree.nodes.set(node.id, node);

   if (node.parentId === null) {
      tree.rootId = node.id;
   } else {
      const parent = tree.nodes.get(node.parentId);
      if (parent) {
         // Insert at beginning - this becomes the new main line
         parent.childIds.unshift(node.id);
      }
   }
}

/**
 * Flatten tree for display.
 * Alternates are shown first (indented), then main line continues.
 */
export function flattenTree(tree: HistoryTree): FlattenedRow[] {
   const result: FlattenedRow[] = [];

   if (!tree.rootId || !tree.nodes.has(tree.rootId)) {
      return result;
   }

   function traverse(nodeId: string, depth: number, isFirstInBranch: boolean): void {
      const node = tree.nodes.get(nodeId);
      if (!node) return;

      result.push({ node, depth, isFirstInBranch });

      if (node.childIds.length === 0) return;

      const [mainChildId, ...alternateIds] = node.childIds;

      // Process alternates first (indented, depth + 1)
      for (const altId of alternateIds) {
         traverse(altId, depth + 1, true);
      }

      // Process main child (same depth)
      if (mainChildId) {
         traverse(mainChildId, depth, false);
      }
   }

   traverse(tree.rootId, 0, false);
   return result;
}

/**
 * Get the path from root to a specific node (for reconstructing game state).
 */
export function getPathToNode(tree: HistoryTree, nodeId: string): HistoryNode[] {
   const path: HistoryNode[] = [];
   let currentId: string | null = nodeId;

   while (currentId) {
      const node = tree.nodes.get(currentId);
      if (!node) break;
      path.unshift(node);
      currentId = node.parentId;
   }

   return path;
}

/**
 * Serialize tree to URL hash format.
 * Format: {id}-{parentId}-{type}-{text}-{colors}.
 * Order: depth-first, main line children before alternates.
 */
export function serializeTreeToHash(tree: HistoryTree): string {
   const parts: string[] = [];

   function traverse(nodeId: string): void {
      const node = tree.nodes.get(nodeId);
      if (!node) return;

      const t = node.type === 1 ? 'b' : node.type === -1 ? 'r' : 'i';
      const parentPart = node.parentId ?? '';
      parts.push(`${node.id}-${parentPart}-${t}-${node.text}-${node.colors}.`);

      // Main child first, then alternates (preserve order for parsing)
      for (const childId of node.childIds) {
         traverse(childId);
      }
   }

   if (tree.rootId) {
      traverse(tree.rootId);
   }

   return parts.join('');
}

/**
 * Parse URL hash into a HistoryTree.
 * First child encountered becomes main line.
 */
export function parseHashToTree(hash: string): HistoryTree {
   const tree = createEmptyTree();

   if (!hash) return tree;

   const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
   const parts = rawHash.split('.').filter(Boolean);

   let maxId = -1;

   for (const part of parts) {
      const segments = part.split('-');
      if (segments.length < 5) continue;

      const [idStr, parentIdStr, typeStr, text, ...colorParts] = segments;
      const colors = colorParts.join('-'); // colors might contain dashes? unlikely but safe

      const id = idStr!;
      const parentId = parentIdStr || null;
      const type = typeStr === 'b' ? 1 : typeStr === 'r' ? -1 : 0;

      const numId = parseInt(id, 10);
      if (!isNaN(numId) && numId > maxId) {
         maxId = numId;
      }

      const node: HistoryNode = {
         id,
         parentId,
         type,
         text: text ?? '',
         colors: colors ?? '',
         score: 0, // recalculated on load
         childIds: [],
      };

      tree.nodes.set(id, node);

      if (parentId === null) {
         tree.rootId = id;
      }
   }

   // Build childIds based on parse order (first = main line)
   for (const part of parts) {
      const segments = part.split('-');
      if (segments.length < 5) continue;

      const [idStr, parentIdStr] = segments;
      const id = idStr!;
      const parentId = parentIdStr || null;

      if (parentId) {
         const parent = tree.nodes.get(parentId);
         if (parent && !parent.childIds.includes(id)) {
            parent.childIds.push(id);
         }
      }
   }

   // Reset ID counter to continue from max
   resetNodeIdCounter(maxId + 1);

   return tree;
}

/**
 * Convert tree nodes to array for JSON storage.
 * Order preserved for main/alternate reconstruction.
 */
export function treeToArray(tree: HistoryTree): HistoryNode[] {
   const result: HistoryNode[] = [];

   function traverse(nodeId: string): void {
      const node = tree.nodes.get(nodeId);
      if (!node) return;

      result.push({ ...node });

      for (const childId of node.childIds) {
         traverse(childId);
      }
   }

   if (tree.rootId) {
      traverse(tree.rootId);
   }

   return result;
}

/**
 * Reconstruct tree from array (e.g., from localStorage).
 */
export function arrayToTree(nodes: HistoryNode[]): HistoryTree {
   const tree = createEmptyTree();

   if (nodes.length === 0) return tree;

   let maxId = -1;

   // First pass: add all nodes to map
   for (const node of nodes) {
      tree.nodes.set(node.id, { ...node, childIds: [] });

      const numId = parseInt(node.id, 10);
      if (!isNaN(numId) && numId > maxId) {
         maxId = numId;
      }

      if (node.parentId === null) {
         tree.rootId = node.id;
      }
   }

   // Second pass: rebuild childIds in order
   for (const node of nodes) {
      if (node.parentId) {
         const parent = tree.nodes.get(node.parentId);
         if (parent) {
            parent.childIds.push(node.id);
         }
      }
   }

   resetNodeIdCounter(maxId + 1);

   return tree;
}
