import { roundTo, assert, Vector, vectorDiff, packKey, unpackKey } from './util';
import {
   neighbors,
   BOARD_MASK,
   bitCount,
   defendedMap,
   centroid,
   Score,
   convertBoardScore,
} from './board';

class Difficulty {
   listsize: string;
   unsure: number; // player.py calls this span limit, default value 5, but it's not not used after being defined
   wordsizelimit: number;
   unsure2: string; // player.py turn uses this to decide whether to play the best word or a randomly selected word
   constructor(listsize: string, unsure: number, wordsizelimit: number, unsure2: string) {
      this.listsize = listsize;
      this.unsure = unsure;
      this.wordsizelimit = wordsizelimit;
      this.unsure2 = unsure2;
   }
}

class Weights {
   dw: number; //defended weight
   uw: number; //undefended weight
   dpw: number; //defended popularity weight
   upw: number; //undefended popularity weight
   mw: number; //median weight
   constructor(dw: number, dpw: number, upw: number, mw: number) {
      this.dw = dw;
      this.uw = 1;
      this.dpw = dpw;
      this.upw = upw;
      this.mw = mw;
   }
}

export class Play {
   score: number = 0;
   word: string = '';
   blue_map: number = 0;
   red_map: number = 0;
   ending_soon?: boolean;
   losing?: boolean;
   constructor(score = 0, word = '', blue_map = 0, red_map = 0) {
      this.score = score;
      this.word = word;
      this.blue_map = blue_map;
      this.red_map = red_map;
   }
}

interface playMemory {
   wordList: string[];
   playedWords: string[];
   undefendedValues: Float32Array;
   defendedValues: Float32Array;
}

export class Player {
   difficulty: Difficulty;
   weights: Weights;
   name: string;
   neighbors: Uint32Array;
   playsMemory: Record<string, playMemory>;
   evalMemory: Map<string, Map<number, number>>; // letters: colors: eval
   wordList: string[];

   constructor(
      difficulty = new Difficulty('A', 5, 25, 'S'),
      weights = new Weights(3.1, 1.28, 2.29, 7.78),
      wordList: string[] = []
   ) {
      this.difficulty = difficulty;
      this.weights = weights;
      this.name = 'stable - player0';
      this.neighbors = neighbors;
      this.playsMemory = Object();
      this.evalMemory = new Map<string, Map<number, number>>();
      assert(Array.isArray(wordList), 'Player.new requires a wordList array');
      this.wordList = wordList
         .map((w: string) => (typeof w === 'string' ? w.toUpperCase().trim() : ''))
         .filter(Boolean);
   }

   possible(letters: string): string[] {
      letters = letters.toUpperCase();
      if (this.playsMemory[letters]) {
         return this.playsMemory[letters]!.wordList.filter(
            (item: string) => !this.playsMemory[letters]!.playedWords.includes(item)
         );
         //so we don't suggest words that have already been played
      }
      const A = 65; // 'A'
      const boardCnt = new Uint8Array(26);
      for (let i = 0; i < 25; i++) {
         const idx = letters.charCodeAt(i) - A;
         if (idx >= 0 && idx < 26) boardCnt[idx]! += 1;
      }

      const found: string[] = [];
      const wordsizelimit = this.difficulty.wordsizelimit;

      const wCnt = new Uint8Array(26);
      const touched: number[] = [];

      for (const candidate of this.wordList) {
         if (candidate.length >= wordsizelimit) continue;
         for (let i = 0; i < candidate.length; i++) {
            const idx = candidate.charCodeAt(i) - A;
            if (idx < 0 || idx >= 26) continue;
            if (wCnt[idx] === 0) touched.push(idx);
            wCnt[idx]! += 1;
         }
         let ok = true;
         for (let t = 0; t < touched.length; t++) {
            const idx = touched[t]!;
            if (wCnt[idx]! > boardCnt[idx]!) {
               ok = false;
               break;
            }
         }
         if (ok) found.push(candidate);
         for (let t = 0; t < touched.length; t++) wCnt[touched[t]!] = 0;
         touched.length = 0;
      }
      // TODO consider moving calculation of scores and popularity to another method
      const letterCnt = new Uint16Array(26);
      for (const word of found) {
         for (let i = 0; i < word.length; i++) {
            const idx = word.charCodeAt(i) - A;
            if (idx >= 0 && idx < 26) letterCnt[idx]! += 1;
         }
      }
      let maxcnt = 0;
      for (let i = 0; i < 26; i++) {
         if (letterCnt[i]! > maxcnt) maxcnt = letterCnt[i]!;
      }
      const letterScore = new Float32Array(26); //normalized [0..1]
      if (maxcnt > 0) {
         for (let i = 0; i < 26; i++) {
            letterScore[i] = roundTo(letterCnt[i]! / maxcnt, 2);
         }
      }
      // calculate defended scores
      const d = new Float32Array(25);
      for (let i = 0; i < 25; i++) {
         const idx = letters.charCodeAt(i) - A;
         const pop = idx >= 0 && idx < 26 ? letterScore[idx]! : 0;
         d[i] = roundTo(this.weights.dw + this.weights.dpw * (1 - pop), 2);
      }
      // calculate undefended scores
      const u = new Float32Array(25);
      for (let row = 0; row < 5; row++) {
         for (let col = 0; col < 5; col++) {
            const i = row * 5 + col;
            const idx = letters.charCodeAt(i) - A;
            const curPop = idx >= 0 && idx < 26 ? letterScore[idx]! : 0;
            let sum = 0;
            let n = 0;
            if (row - 1 >= 0) {
               const j = (row - 1) * 5 + col;
               const idj = letters.charCodeAt(j) - A;
               sum += idj >= 0 && idj < 26 ? letterScore[idj]! : 0;
               n++;
            }
            if (col + 1 < 5) {
               const j = row * 5 + col + 1;
               const idj = letters.charCodeAt(j) - A;
               sum += idj >= 0 && idj < 26 ? letterScore[idj]! : 0;
               n++;
            }
            if (row + 1 < 5) {
               const j = (row + 1) * 5 + col;
               const idj = letters.charCodeAt(j) - A;
               sum += idj >= 0 && idj < 26 ? letterScore[idj]! : 0;
               n++;
            }
            if (col - 1 >= 0) {
               const j = row * 5 + col - 1;
               const idj = letters.charCodeAt(j) - A;
               sum += idj >= 0 && idj < 26 ? letterScore[idj]! : 0;
               n++;
            }
            const mean = n ? (sum + n * (1 - curPop)) / (2 * n) : 0;
            u[i] = roundTo(this.weights.uw + this.weights.upw * mean, 2);
         }
      }
      this.playsMemory[letters] = {
         wordList: found,
         playedWords: [],
         defendedValues: d,
         undefendedValues: u,
      };
      return found;
   }

   concentrate(allLetters: string, needLetters = '', notLetters = '', anyLetters = '') {
      const possibleWords = this.possible(allLetters);
      // Fast-path: no filters => return as-is
      if (!needLetters && !notLetters && !anyLetters) return possibleWords;

      const A = 65;
      // Board letter availability counts
      const boardCnt = new Uint8Array(26);
      for (let i = 0; i < 25; i++) {
         const idx = allLetters.charCodeAt(i) - A;
         if (idx >= 0 && idx < 26) boardCnt[idx]! += 1;
      }

      // Need counts and presence mask
      const needCnt = new Uint8Array(26);
      let needMask = 0; // bitmask of which letters are in needLetters
      for (let i = 0; i < needLetters.length; i++) {
         const idx = needLetters.charCodeAt(i) - A;
         if (idx >= 0 && idx < 26) {
            needCnt[idx]! += 1;
            needMask |= 1 << idx;
         }
      }

      // Not: compute available counts directly (board - not)
      const availAfterNot = new Uint8Array(26);
      let notMask = 0;
      for (let i = 0; i < 26; i++) availAfterNot[i] = boardCnt[i]!;
      for (let i = 0; i < notLetters.length; i++) {
         const idx = notLetters.charCodeAt(i) - A;
         if (idx >= 0 && idx < 26) {
            availAfterNot[idx] = availAfterNot[idx]! > 0 ? availAfterNot[idx]! - 1 : 0;
            notMask |= 1 << idx;
         }
      }

      // Any-letter presence as bitmask
      let anyMask = 0;
      for (let i = 0; i < anyLetters.length; i++) {
         const idx = anyLetters.charCodeAt(i) - A;
         if (idx >= 0 && idx < 26) anyMask |= 1 << idx;
      }
      const hasAny = anyMask !== 0;
      const hasNot = notMask !== 0;

      // Combined relevance mask for quick skip
      const relevantMask = needMask | notMask | anyMask;

      // Build prefix set of played words
      const prefixBlocked = new Set<string>();
      const playedWords = this.playsMemory[allLetters]!.playedWords;
      if (playedWords.length > 0) {
         for (const played of playedWords) {
            for (let i = 1; i < played.length; i++) {
               prefixBlocked.add(played.slice(0, i));
            }
         }
      }
      const hasBlocked = prefixBlocked.size > 0;

      // Per-word counters - use simple reset instead of touched array
      const wCnt = new Uint8Array(26);
      const out: string[] = [];

      for (const word of possibleWords) {
         // Quick prefix check first (often eliminates words early)
         if (hasBlocked && prefixBlocked.has(word)) continue;

         let anyMatch = !hasAny;
         let usedMask = 0; // track which indices we touched

         // Count only letters we care about
         for (let i = 0; i < word.length; i++) {
            const idx = word.charCodeAt(i) - A;
            if (idx < 0 || idx >= 26) continue;
            const bit = 1 << idx;
            if (relevantMask & bit) {
               wCnt[idx]! += 1;
               usedMask |= bit;
               if (!anyMatch && anyMask & bit) anyMatch = true;
            }
         }

         // Check need: word must have at least the required counts
         let ok = true;
         if (needMask) {
            let checkMask = needMask;
            while (checkMask && ok) {
               const bit = checkMask & -checkMask;
               const idx = 31 - Math.clz32(bit);
               if (wCnt[idx]! < needCnt[idx]!) ok = false;
               checkMask ^= bit;
            }
         }

         // Check not: cannot exceed available after reserving notCnt
         if (ok && hasNot) {
            let checkMask = usedMask & notMask;
            while (checkMask && ok) {
               const bit = checkMask & -checkMask;
               const idx = 31 - Math.clz32(bit);
               if (wCnt[idx]! > availAfterNot[idx]!) ok = false;
               checkMask ^= bit;
            }
         }

         if (ok && hasAny && !anyMatch) ok = false;
         if (ok) out.push(word);

         // Reset only touched indices using bitmask
         while (usedMask) {
            const bit = usedMask & -usedMask;
            const idx = 31 - Math.clz32(bit);
            wCnt[idx] = 0;
            usedMask ^= bit;
         }
      }
      return out;
   }

   // TODO: move to util.js
   *combinations(arr: number[], k: number): IterableIterator<number[]> {
      const n = arr.length;
      if (k < 0 || k > n) return;
      const combo = new Array<number>(k);

      function* rec(start: number, depth: number): IterableIterator<number[]> {
         if (depth === k) {
            yield combo.slice();
            return;
         }
         // Prune so there are enough items left to fill the combo
         for (let i = start; i <= n - (k - depth); i++) {
            combo[depth] = arr[i]!;
            yield* rec(i + 1, depth + 1);
         }
      }

      if (k === 0) {
         yield [];
         return;
      }

      yield* rec(0, 0);
   }

   goalValue(goal: number, blue: number, red: number, move: number) {
      // letter popularity reduced the strength of the engine
      // centroid is more important
      let playerVector = new Vector();
      const goalVector = centroid(goal);
      if (move == 1) {
         if (blue > 0) {
            playerVector = centroid(blue);
         }
      } else {
         if (red > 0) {
            playerVector = centroid(red);
         }
      }
      return vectorDiff(playerVector, goalVector);
   }

   computeGoal(allLetters: string, blue: number, red: number, move: number) {
      const goodGoals = [];
      const unoccupiedMap = ~(blue | red);
      const unoccupied = [];
      for (let x = 0; x < 25; x++) {
         if (((1 << x) & unoccupiedMap) == 1 << x) {
            unoccupied.push(x);
         }
      }
      const lst = this.possible(allLetters);
      for (let r = 2; r < unoccupied.length; r++) {
         for (const goal of this.combinations(unoccupied, r)) {
            let goalStr = '';
            for (const i of goal) goalStr += allLetters.charAt(i);
            let goodGoal = true;
            for (const word of lst) {
               // find one word that uses all the goal letters
               let goodWord = true;
               for (const letter of goalStr) {
                  if (word.split(letter).length < goalStr.split(letter).length) {
                     goodWord = false;
                     break;
                  }
               }
               if (goodWord) {
                  // we found a word that uses all the goal letters
                  goodGoal = false;
                  break;
               }
            }
            if (goodGoal) {
               let goalMap = 0;
               for (const i of goal) goalMap |= 1 << i;
               goodGoals.push(goalMap);
            }
         }
         if (goodGoals.length != 0) break;
      }
      // once we get here, we've got either an empty list, or a list of equally-sized goals
      // we choose the "best" goal by using the goal value function
      if (goodGoals.length == 0) return 0;
      else {
         let bestGoal = 0;
         let bestValue = -Infinity;
         for (const goal of goodGoals) {
            const value = this.goalValue(goal, blue, red, move);
            if (value > bestValue) {
               bestValue = value;
               bestGoal = goal;
            }
         }
         return bestGoal;
      }
   }

   groupWords(words: string[], anyl: string): Record<string, string[]> {
      // groups words to limit the number of calls to arrange
      const wordGroups: Record<string, string[]> = {};
      for (const word of words) {
         let group = '';
         for (const letter of word) {
            if (anyl.split(letter).length > 1) {
               // TODO: research if a word having more letters than anyl is an issue
               // meaning if anyl is 'LAO', 'HELLO' as a word would have group 'LLO', maybe it should be 'LO'
               // seems like this results in more calls to arrange than necessary
               // this "bug" (?) was present in the original python
               group = group + letter;
            }
         }
         group = group.split('').sort().join(''); //we care if the group has the same letters, not the same order of letters
         if (wordGroups[group]) {
            wordGroups[group]!.push(word);
         } else {
            wordGroups[group] = [word];
         }
      }
      return wordGroups;
   }

   evaluatePos(allLetters: string, s: Score): number {
      // returns a number indicating who is winning, and by how much.  positive, blue; negative, red.
      // TODO: the Python version memoized this method with a hash table
      if (this.evalMemory.has(allLetters)) {
         if (this.evalMemory.get(allLetters)!.has(packKey(s.blue, s.red))) {
            return this.evalMemory.get(allLetters)!.get(packKey(s.blue, s.red))!;
         }
      }
      const ending = bitCount((s.blue | s.red) & BOARD_MASK) == 25;
      let total = 0;
      if (!ending) {
         // TODO: refactor to avoid magic numbers 2 and 3
         const d = this.playsMemory[allLetters]!.defendedValues; // defended
         const u = this.playsMemory[allLetters]!.undefendedValues; // undefended
         const n = this.neighbors;
         let blueScore = 0,
            redScore = 0;
         let sm = s.blue & BOARD_MASK;
         while (sm) {
            const lsb = sm & -sm;
            const i = 31 - Math.clz32(lsb);
            blueScore += (s.blue & n[i]!) === n[i] ? d[i]! : u[i]!;
            sm ^= lsb;
         }
         sm = s.red & BOARD_MASK;
         while (sm) {
            const lsb = sm & -sm;
            const i = 31 - Math.clz32(lsb);
            redScore += (s.red & n[i]!) === n[i] ? d[i]! : u[i]!;
            sm ^= lsb;
         }

         // bonus for being away from the zero letters
         const blueCenter = centroid(s.blue);
         const redCenter = centroid(s.red);
         const zeroCenter = centroid(~(s.red | s.blue));
         const blueDiff = vectorDiff(blueCenter, zeroCenter);
         const redDiff = vectorDiff(redCenter, zeroCenter);
         total = blueScore - redScore + this.weights.mw * (blueDiff - redDiff);
      } else {
         total = (bitCount(s.blue & BOARD_MASK) - bitCount(s.red & BOARD_MASK)) * 1000;
      }
      if (this.evalMemory.has(allLetters)) {
         this.evalMemory.get(allLetters)!.set(packKey(s.blue, s.red), total);
      } else {
         this.evalMemory.set(allLetters, new Map<number, number>());
         this.evalMemory.get(allLetters)!.set(packKey(s.blue, s.red), total);
      }
      return total;
   }

   arrange(
      allLetters: string,
      word: string,
      s: Score,
      scores: Map<number, number> = new Map<number, number>(),
      avoidIndexes: number[] = [],
      move = 1
   ): void {
      // Evaluate all placements of a word
      // 1) Count occurrences per distinct letter in the word.
      const wordhist: Record<string, number> = {};
      for (const letter of word) {
         wordhist[letter] = (wordhist[letter] ?? 0) + 1;
      }
      // 2) Build positions-by-letter once by scanning the board.
      const posByLetter: Record<string, number[]> = Object.create(null);
      for (let i = 0; i < allLetters.length; i++) {
         const ch = allLetters.charAt(i);
         (posByLetter[ch] ??= []).push(i);
      }
      // 3) Avoided positions bitmask.
      let avoidMask = 0;
      for (const i of avoidIndexes) avoidMask |= 1 << i;
      // 4) For each distinct letter, precompute the bitmask combos of its positions choose count.
      const letterMasksPerGroup: number[][] = [];
      for (const letter in wordhist) {
         const count = wordhist[letter]!;
         const allPos = posByLetter[letter] ?? [];
         // Filter out avoided positions
         const avail: number[] = [];
         for (let k = 0; k < allPos.length; k++) {
            const idx = allPos[k]!;
            if ((avoidMask & (1 << idx)) === 0) avail.push(idx);
         }
         // Generate combinations as bit masks
         const masks: number[] = [];
         const n = avail.length;
         if (count <= n) {
            const combo: number[] = new Array(count);
            function rec(start: number, depth: number) {
               if (depth === count) {
                  let m = 0;
                  for (let t = 0; t < count; t++) m |= 1 << combo[t]!;
                  masks.push(m);
                  return;
               }
               for (let i = start; i <= n - (count - depth); i++) {
                  combo[depth] = avail[i]!;
                  rec(i + 1, depth + 1);
               }
            }
            if (count === 0) {
               masks.push(0);
            } else {
               rec(0, 0);
            }
         }
         letterMasksPerGroup.push(masks);
      }
      // 5) Stream the Cartesian product by recursive union of bit masks; evaluate each play on the fly.
      const oldBlue = s.blue;
      const oldRed = s.red;
      const tempScore = new Score();
      const groups = letterMasksPerGroup;
      const gLen = groups.length;
      function combine(this: Player, groupIdx: number, accMask: number) {
         if (groupIdx === gLen) {
            const playMask = accMask & BOARD_MASK;
            // Apply allowed positions in one shot (skip defended cells)
            if (move === 1) {
               const allowed = playMask & ~s.reddef;
               tempScore.blue = (oldBlue | allowed) & BOARD_MASK;
               tempScore.red = oldRed & ~allowed & BOARD_MASK;
            } else {
               const allowed = playMask & ~s.bluedef;
               tempScore.blue = oldBlue & ~allowed & BOARD_MASK;
               tempScore.red = (oldRed | allowed) & BOARD_MASK;
            }
            const key = packKey(tempScore.blue, tempScore.red);
            if (!scores.has(key)) {
               const val = this.evaluatePos(allLetters, tempScore);
               scores.set(key, val);
            }
            return;
         }
         const masks = groups[groupIdx]!;
         for (let i = 0; i < masks.length; i++) {
            combine.call(this, groupIdx + 1, accMask | masks[i]!);
         }
      }
      combine.call(this, 0, 0);
   }

   playIsSafe(group: string[], play: string) {
      // determines whether playing a member of a group is safe,
      // that is, it would not allow the opponent to play the last word of this group
      assert(group.indexOf(play) >= 0, 'playIsSafe: play not found in group');
      const newgroup = [];
      for (const word of group) {
         const length = word.length;
         if (play.slice(0, length) != word) {
            newgroup.push(word);
         }
      }
      group = newgroup;
      const category = { single: 0, double: 0, big: 0 };
      newgroup.sort((a, b) => a.length - b.length);

      const children: Set<string> = new Set<string>();

      for (let i = 0; i < newgroup.length; i++) {
         const word1: string = newgroup[i]!;
         if (children.has(word1)) continue;

         const len1: number = word1.length;
         const mychildren: string[] = [];

         // Collect direct children: longer words starting with word1
         for (let j = i + 1; j < newgroup.length; j++) {
            const word2: string = newgroup[j]!;
            if (word2.slice(0, len1) === word1) {
               mychildren.push(word2);
               children.add(word2);
            }
         }

         if (mychildren.length) {
            let doubleFlag = true;
            mychildren.sort((a, b) => a.length - b.length);

            // If any child is a prefix of another child, mark as 'big'
            for (let k = 0; k < mychildren.length - 1; k++) {
               const child1: string = mychildren[k]!;
               const lenChild1: number = child1.length;
               for (let m = k + 1; m < mychildren.length; m++) {
                  const child2: string = mychildren[m]!;
                  if (child2.slice(0, lenChild1) === child1) {
                     category.big += 1;
                     doubleFlag = false;
                  }
               }
            }

            if (doubleFlag) {
               category.double += 1;
            }
         } else {
            category.single += 1;
         }
      }
      if (category.big > 0) return false;
      return category.single % 2 === 0 && category.double % 2 === 0;
   }

   // Fast grouping: use a 26-entry presence table for letters in 'anyl'
   private groupWordsByPresence(words: string[], present: Uint8Array): Record<string, string[]> {
      const groups: Record<string, string[]> = Object.create(null);
      for (const word of words) {
         let grp = '';
         for (let i = 0; i < word.length; i++) {
            const code = word.charCodeAt(i) - 65; // 'A'..'Z' -> 0..25
            if (code >= 0 && code < 26 && present[code] === 1) {
               grp += word[i]!;
            }
         }
         // Sort letters to normalize group key (same letters, any order)
         grp = grp ? grp.split('').sort().join('') : '';
         (groups[grp] ??= []).push(word);
      }
      return groups;
   }

   decide(
      allLetters: string,
      score: string,
      needLetters: string,
      notLetters: string,
      move: number
   ) {
      // judges the merits of possible plays for this board
      allLetters = allLetters.toUpperCase();
      const s: Score = convertBoardScore(score);
      let targets = 0;
      if (move == 1) {
         targets = (s.red & ~s.reddef) | (~s.blue & ~s.red);
      } else {
         targets = (s.blue & ~s.bluedef) | (~s.blue & ~s.red);
      }
      // Build 'anyl' string and presence table once
      let anyl: string = '';
      const anylPresent = new Uint8Array(26); // 0/1 per letter A..Z
      const dontuse: number[] = [];
      let goal: number = 0;
      let maxWordSize: number = 0;
      let wordList: string[] = [];
      // find goal for notLetters (if none given already)
      if (!notLetters && !needLetters) {
         wordList = this.possible(allLetters);
         for (const word of wordList) {
            if (word.length > maxWordSize) maxWordSize = word.length;
         }
         if (maxWordSize < 13) {
            // based on testing goal vs flexible version
            goal = this.computeGoal(allLetters, s.blue, s.red, move);
         }
         for (let i = 0; i < allLetters.length; i++) {
            const letter = allLetters.charAt(i);
            if ((1 << i) & targets) {
               anyl += letter;
               anylPresent[letter.charCodeAt(0) - 65] = 1;
            }
            if ((1 << i) & goal) {
               dontuse.push(i);
               notLetters += letter;
            }
         }
      } else {
         for (let i = 0; i < allLetters.length; i++) {
            const letter = allLetters.charAt(i);
            if ((1 << i) & targets) {
               anyl += letter;
               anylPresent[letter.charCodeAt(0) - 65] = 1;
            }
         }
      }
      wordList = this.concentrate(allLetters, needLetters, notLetters, anyl);
      // const wordGroups = this.groupWords(wordList, anyl);
      const wordGroups = this.groupWordsByPresence(wordList, anylPresent);
      const plays = [];
      for (const group in wordGroups) {
         // scores formed by different arrangements of the same group
         // entries of the form [blue,red]:score
         const scores: Map<number, number> = new Map();
         this.arrange(allLetters, group, s, scores, dontuse, move);
         let blue, red;
         for (const [position, score] of scores) {
            const playscore = roundTo(score, 3);
            for (const word of wordGroups[group]!) {
               [blue, red] = unpackKey(position);
               plays.push(new Play(playscore, word, blue, red));
            }
         }
      }
      let bestScore = 0;
      let inc;
      if (move == 1 && plays.length > 0) {
         bestScore = plays.reduce((max, p) => (p.score > max ? p.score : max), -Infinity);
         inc = 0.0005;
      } else if (move == -1 && plays.length > 0) {
         bestScore = plays.reduce((min, p) => (p.score < min ? p.score : min), Infinity);
         inc = -0.0005;
      } else {
         return plays;
      }
      // we'd like to play the last word of the best group, so check which plays are safe of the best group
      const bestPlays = new Map();
      if (Math.abs(bestScore) < 1000) {
         for (const [i, play] of plays.entries()) {
            if (play.score == bestScore) {
               bestPlays.set(i, play);
            }
         }
         const bestGroup = [...bestPlays.values()].map((play) => play.word);
         for (const [i, play] of bestPlays) {
            if (this.playIsSafe(bestGroup, play.word)) {
               plays[i] = new Play(
                  roundTo(play.score + inc, 4),
                  play.word,
                  play.blue_map,
                  play.red_map
               );
            }
         }
      }
      return plays;
   }

   // Group plays by score, sort unique scores, then flatten.
   // Uses insertion sort for secondary ordering by word length within each bucket.
   private bucketSortByScore(plays: Play[], move: number): Play[] {
      const buckets = new Map<number, Play[]>();
      for (const p of plays) {
         const k = p.score;
         const b = buckets.get(k);
         if (b) {
            b.push(p);
         } else {
            buckets.set(k, [p]);
         }
      }
      const keys = Array.from(buckets.keys());
      keys.sort((a, b) => (move > 0 ? b - a : a - b));
      const out: Play[] = [];
      for (const k of keys) {
         out.push(...buckets.get(k)!);
      }
      return out;
   }

   search(
      allLetters: string,
      score: string,
      needLetters: string,
      notLetters: string,
      move: number
   ) {
      const plays = this.decide(allLetters, score, needLetters, notLetters, move);
      // TODO (?) implement random difficulty
      const LARGE_THRESHOLD = 200;
      if (plays.length > LARGE_THRESHOLD) {
         return this.bucketSortByScore(plays, move);
      }
      plays.sort((a, b) => {
         const diff = move > 0 ? b.score - a.score : a.score - b.score;
         if (diff !== 0) return diff;
         return b.word.length - a.word.length;
      });
      return plays;
   }

   endgameCheck(allLetters: string, blue: number, red: number, move: number) {
      //called by interface to check a page of search results at a time
      //purpose: an extra depth of search to check if a play loses or forces the end soon
      let zeroletters = '';
      const zeros = ~blue & ~red;
      let anyl = '';
      const bluedef = defendedMap(blue);
      const reddef = defendedMap(red);
      let targets = 0;
      if (move == 1) {
         targets = (blue & ~bluedef) | zeros;
      } else {
         targets = (red & ~reddef) | zeros;
      }
      for (let i = 0; i < 25; i++) {
         if (targets & (1 << i)) {
            anyl += allLetters.charAt(i);
         }
         if (zeros & (1 << i)) {
            zeroletters += allLetters.charAt(i);
         }
      }
      let gameendingwords = [];
      let losing = false;
      let endingsoon = false;
      let newscore = null;
      if (zeroletters) {
         if (this.playsMemory[allLetters + zeroletters]) {
            gameendingwords = this.playsMemory[allLetters + zeroletters]!.wordList;
         } else {
            gameendingwords = this.concentrate(allLetters, zeroletters);
            this.playsMemory[allLetters + zeroletters] = {
               wordList: gameendingwords,
               playedWords: [],
               undefendedValues: new Float32Array(),
               defendedValues: new Float32Array(),
            };
         }
         const wordgroups = this.groupWords(gameendingwords, anyl);
         for (const gameendingword in wordgroups) {
            const scores = new Map();
            const used: number[] = [];
            this.arrange(
               allLetters,
               gameendingword,
               new Score(blue, red, bluedef, reddef),
               scores,
               used,
               -move
            );
            if (move == 1) {
               newscore = [...scores.values()].reduce((prev, curr) => (prev < curr ? prev : curr));
               if (newscore <= -1000) {
                  losing = true;
                  break;
               }
            } else {
               newscore = [...scores.values()].reduce((prev, curr) => (prev > curr ? prev : curr));
               if (newscore >= 1000) {
                  losing = true;
                  break;
               }
            }
         }
      }
      if (gameendingwords.length > 0) {
         endingsoon = true;
      }
      return [endingsoon, losing];
   }

   playword(allletters: string, word: string) {
      this.playsMemory[allletters]!.playedWords.push(word);
   }

   resetplayed(allletters: string, words: string[]) {
      this.playsMemory[allletters]!.playedWords = words;
   }

   unplayword(allletters: string, word: string) {
      const idx = this.playsMemory[allletters]!.playedWords.indexOf(word);
      if (idx !== -1) {
         this.playsMemory[allletters]!.playedWords.splice(idx, 1);
      }
   }
}
