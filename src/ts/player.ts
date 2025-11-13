import { roundTo, assert } from './util';

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

class Score {
   blue: number;
   red: number;
   bluedef: number;
   reddef: number;
   constructor(blue = 0, red = 0, bluedef = 0, reddef = 0) {
      this.blue = blue;
      this.red = red;
      this.bluedef = bluedef;
      this.reddef = reddef;
   }
}

class Vector {
   x: number = 2;
   y: number = 2;
   constructor(x = 2, y = 2) {
      this.x = x;
      this.y = y;
   }
}

export class Play {
   score: number = 0;
   word: string = '';
   group_size: number = 0;
   blue_map: number = 0;
   red_map: number = 0;
   ending_soon?: boolean;
   losing?: boolean;
   constructor(score = 0, word = '', group_size = 0, blue_map = 0, red_map = 0) {
      this.score = score;
      this.word = word;
      this.group_size = group_size;
      this.blue_map = blue_map;
      this.red_map = red_map;
   }
}

export class Player {
   difficulty: Difficulty;
   weights: Weights;
   name: string;
   neighbors: Map<number, number>;
   cache;
   hashtable;
   wordList: string[];
   constructor(
      difficulty = new Difficulty('A', 5, 25, 'S'),
      weights = new Weights(3.1, 1.28, 2.29, 7.78),
      wordList: string[] = []
   ) {
      this.difficulty = difficulty;
      this.weights = weights;
      this.name = 'stable - player0';
      this.neighbors = new Map();
      this.buildNeighbors();
      this.cache = Object();
      this.hashtable = Object();
      assert(Array.isArray(wordList), 'Player.new requires a wordList array');
      this.wordList = wordList
         .map((w: string) => (typeof w === 'string' ? w.toUpperCase().trim() : ''))
         .filter(Boolean);
   }

   // TODO: move to board
   saveNeighbor(square: number, nsquare: number) {
      // helper for buildNeighbors
      if (nsquare >= 0 && nsquare < 25) {
         if (this.neighbors.has(square)) {
            this.neighbors.set(square, this.neighbors.get(square)! | (1 << nsquare));
         } else {
            this.neighbors.set(square, 1 << nsquare);
         }
      }
   }

   // TODO: move to board
   buildNeighbors() {
      for (let square = 0; square < 25; square++) {
         this.saveNeighbor(square, square);
         this.saveNeighbor(square, square - 5);
         if (square % 5 != 4) this.saveNeighbor(square, square + 1);
         if (square % 5 != 0) this.saveNeighbor(square, square - 1);
         this.saveNeighbor(square, square + 5);
      }
   }

   // roundTo(num, decimalPlaces) {
   //    const factor = Math.pow(10, decimalPlaces);
   //    return Math.round(num * factor) / factor;
   // }

   possible(letters: string) {
      letters = letters.toUpperCase();
      // TODO - refactor to avoid magic number 0 and 1 here
      if (this.cache[letters]) {
         return this.cache[letters][0].filter(
            (item: string) => !this.cache[letters][1].includes(item)
         );
         //so we don't suggest words that have already been played
      }
      const found = [];
      const wordsizelimit = this.difficulty.wordsizelimit;
      let good = true;
      for (const candidate of this.wordList.filter((word) => word.length < wordsizelimit)) {
         good = true;
         for (const letter of candidate) {
            if (letters.split(letter).length < candidate.split(letter).length) {
               good = false;
               break;
            }
         }
         if (good) {
            found.push(candidate);
         }
      }
      // TODO consider moving calculation of scores and popularity to another method
      const letterdict = Object();
      for (const word of found) {
         for (const letter of word) {
            if (letterdict[letter]) {
               letterdict[letter] += 1;
            } else {
               letterdict[letter] = 1;
            }
         }
      }
      const letterlist = [];
      const cnt = [];
      for (const letter in letterdict) {
         letterlist.push(letter);
         cnt.push(letterdict[letter]);
      }
      const maxcnt = Math.max(...cnt);
      for (const i in cnt) {
         cnt[i] = cnt[i] / maxcnt; // makes all between 0 and 1
      }
      for (const [i, letter] of letterlist.entries()) {
         letterdict[letter] = roundTo(cnt[i], 2);
      }
      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
         if (!letterdict[letter]) {
            letterdict[letter] = 0;
         }
      }
      // calculate defended scores
      const d = Array(25).fill(0);
      for (let i = 0; i < 25; i++) {
         d[i] = roundTo(
            this.weights.dw + this.weights.dpw * (1 - letterdict[letters.charAt(i)]),
            2
         );
      }
      // calculate undefended scores
      const u = Array(25).fill(0);
      for (let row = 0; row < 5; row++) {
         for (let col = 0; col < 5; col++) {
            const neighborList = [];
            if (row - 1 >= 0) {
               neighborList.push(letterdict[letters.charAt((row - 1) * 5 + col)]);
            }
            if (col + 1 < 5) {
               neighborList.push(letterdict[letters.charAt(row * 5 + col + 1)]);
            }
            if (row + 1 < 5) {
               neighborList.push(letterdict[letters.charAt((row + 1) * 5 + col)]);
            }
            if (col - 1 >= 0) {
               neighborList.push(letterdict[letters.charAt(row * 5 + col - 1)]);
            }
            const size = neighborList.length;
            for (let x = 0; x < size; x++) {
               neighborList.push(1 - letterdict[letters.charAt(row * 5 + col)]);
            }
            u[row * 5 + col] = roundTo(
               this.weights.uw +
                  (this.weights.upw * neighborList.reduce((prev, curr) => prev + curr)) /
                     neighborList.length,
               2
            );
         }
      }
      this.cache[letters] = [found, [], d, u]; // valid words, played words, defended scores, undefended scores
      return found;
   }

   concentrate(allLetters: string, needLetters = '', notLetters = '', anyLetters = '') {
      assert(allLetters == allLetters.toUpperCase());
      assert(needLetters == needLetters.toUpperCase());
      assert(notLetters == notLetters.toUpperCase());
      assert(anyLetters == anyLetters.toUpperCase());
      const possibleWords = this.possible(allLetters);
      let needLetterWordList = [];
      if (needLetters != '') {
         //find words that use all needLetters
         for (const word of possibleWords) {
            let good = true;
            for (const letter of needLetters) {
               if (word.split(letter).length < needLetters.split(letter).length) {
                  good = false;
                  break;
               }
            }
            if (good) needLetterWordList.push(word);
         }
      } else {
         needLetterWordList = possibleWords;
      }
      let notLetterWordList = [];
      if (notLetters != '') {
         //remove words that depend on notLetters
         for (const word of needLetterWordList) {
            let good = true;
            for (const letter of notLetters) {
               if (
                  word.split(letter).length - 1 >
                  allLetters.split(letter).length - notLetters.split(letter).length
               ) {
                  good = false;
                  break;
               }
            }
            if (good) notLetterWordList.push(word);
         }
      } else {
         notLetterWordList = needLetterWordList;
      }
      let anyLetterWordList = [];
      if (anyLetters != '') {
         //remove words that don't use one of the anyLetters
         for (const word of notLetterWordList) {
            let good = false;
            for (const letter of anyLetters) {
               if (word.includes(letter)) {
                  good = true;
                  break;
               }
            }
            if (good) anyLetterWordList.push(word);
         }
      } else {
         anyLetterWordList = notLetterWordList;
      }
      return anyLetterWordList;
   }

   // TODO: move to board.js
   convertBoardScore(scoreString: string) {
      // produces bitmaps from a string of characters representing the colors
      let i = 0;
      let prevchar = 'W';
      const s = new Score();
      for (const char of scoreString) {
         if (i < 25) {
            if (char == 'B') {
               s.blue = s.blue | (1 << i);
               prevchar = char;
               i += 1;
            } else if (char == 'R') {
               s.red = s.red | (1 << i);
               prevchar = char;
               i += 1;
            } else if ('0123456789'.includes(char)) {
               const num = parseInt(char);
               for (let d = 1; d < num; d++) {
                  if (i < 25) {
                     if (prevchar == 'R') {
                        s.red = s.red | (1 << i);
                     } else if (prevchar == 'B') {
                        s.blue = s.blue | (1 << i);
                     }
                  }
                  i += 1;
               }
            } else {
               prevchar = 'W';
               i += 1;
            }
         }
      }
      for (i = 0; i < 25; i++) {
         if ((s.blue & this.neighbors.get(i)!) == this.neighbors.get(i)) {
            s.bluedef = s.bluedef | (1 << i);
         }
         if ((s.red & this.neighbors.get(i)!) == this.neighbors.get(i)) {
            s.reddef = s.reddef | (1 << i);
         }
      }
      return s;
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

   // TODO: move to board.js
   centroid(map: number) {
      let cnt = 0;
      let ysum = 0;
      let xsum = 0;
      for (let i = 0; i < 25; i++) {
         if (((1 << i) & map) > 0) {
            const y = Math.floor(i / 5);
            const x = i % 5;
            ysum += y;
            xsum += x;
            cnt += 1;
         }
      }
      if (cnt > 0) {
         return new Vector(xsum / cnt, ysum / cnt);
      } else {
         return new Vector(2, 2);
      }
   }

   // TODO: move to util.js
   vectorDiff = (v1: Vector, v2: Vector) => Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);

   goalValue(goal: number, blue: number, red: number, move: number) {
      // letter popularity reduced the strength of the engine
      // centroid is more important
      let playerVector = new Vector();
      const goalVector = this.centroid(goal);
      if (move == 1) {
         if (blue > 0) {
            playerVector = this.centroid(blue);
         }
      } else {
         if (red > 0) {
            playerVector = this.centroid(red);
         }
      }
      return this.vectorDiff(playerVector, goalVector);
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

   evaluatePos(allLetters: string, s: Score) {
      // returns a number indicating who is winning, and by how much.  positive, blue; negative, red.
      // TODO: the Python version memoized this method with a hash table
      const ending = (s.blue | s.red).toString(2).split('1').length == 26;
      let total = 0;
      if (!ending) {
         // TODO: refactor to avoid magic numbers 2 and 3
         const d = this.cache[allLetters][2]; // defended
         const u = this.cache[allLetters][3]; // undefended
         const n = this.neighbors;
         let blueScore = 0;
         let redScore = 0;
         for (let i = 0; i < 25; i++) {
            if (s.blue & (1 << i)) {
               if ((s.blue & n.get(i)!) == n.get(i)) {
                  blueScore += d[i];
               } else {
                  blueScore += u[i];
               }
            }
            if (s.red & (1 << i)) {
               if ((s.red & n.get(i)!) == n.get(i)) {
                  redScore += d[i];
               } else {
                  redScore += u[i];
               }
            }
         }
         // bonus for being away from the zero letters
         const blueCenter = this.centroid(s.blue);
         const redCenter = this.centroid(s.red);
         const zeroCenter = this.centroid(~(s.red | s.blue));
         const blueDiff = this.vectorDiff(blueCenter, zeroCenter);
         const redDiff = this.vectorDiff(redCenter, zeroCenter);
         total = blueScore - redScore + this.weights.mw * (blueDiff - redDiff);
      } else {
         total =
            (s.blue.toString(2).split('1').length - 1 - (s.red.toString(2).split('1').length - 1)) *
            1000;
      }
      return total;
   }

   packKey(blue: number, red: number) {
      return blue * 2 ** 25 + red;
   }
   unpackKey(key: number) {
      return [Math.floor(key / 2 ** 25), key % 2 ** 25];
   }

   arrange(
      allLetters: string,
      word: string,
      s: Score,
      scores: Map<number, number> = new Map<number, number>(),
      avoidIndexes: number[] = [],
      move = 1
   ): void {
      // function to evaluate all placements of a word
      // for each unique letter, get a list of lists for the indexes it can be played in
      const wordhist: Record<string, number> = {};
      for (const letter of word) {
         wordhist[letter] = word.split(letter).length - 1;
      }
      const letteroptions: number[][][] = [];
      for (const letter in wordhist) {
         const letterplaces: number[] = [];
         for (let i = 0; i < allLetters.length; i++) {
            const letter2 = allLetters.charAt(i);
            if (letter == letter2 && avoidIndexes.indexOf(i) < 0) {
               //letter matches and we weren't told to avoid this spot
               letterplaces.push(i);
            }
         }
         const letterCombos: number[][] = [];
         for (const combo of this.combinations(letterplaces, wordhist[letter]!)) {
            letterCombos.push(combo);
         }
         letteroptions.push(letterCombos);
      }
      // create a new list with enough elements to hold all the options above (multiply the length of all the lists)
      let lenwordplays = 1;
      for (const lst of letteroptions) {
         lenwordplays *= lst.length;
      }
      const wordplays: number[][] = Array.from({ length: lenwordplays }, () => [] as number[]);
      // write the options to wordPlays to get all the ways to play this word
      // [[[1,],[2]],[[3,4],[3,5],[4,5]]] becomes [[1,3,4],[1,3,5],[1,4,5],[2,3,4],[2,3,5],[2,4,5]]
      let divisor = 1;
      for (const letterplays of letteroptions) {
         divisor *= letterplays.length;
         const cutoff = Math.floor(lenwordplays / divisor);
         if (letterplays.length > 1) {
            for (let playindex = 0; playindex < lenwordplays; playindex++) {
               const lookup = Math.floor(playindex / cutoff) % letterplays.length;
               for (const index of letterplays[lookup]!) {
                  wordplays[playindex]!.push(index);
               }
            }
         } else {
            for (const i of letterplays[0]!) {
               if (move == 1 && ((1 << i) & s.reddef) == 0) {
                  s.blue = s.blue | (1 << i); // set 1 to position i
                  s.red = s.red & ~(1 << i); // set 0 to position i
               } else if (move == -1 && ((1 << i) & s.bluedef) == 0) {
                  s.blue = s.blue & ~(1 << i); // set  0 to position i
                  s.red = s.red | (1 << i); // set 1 to position i
               }
            }
         }
      }
      // for each play create new maps for what the position looks like using those indexes, and evaluate each position
      const oldred = s.red;
      const oldblue = s.blue;
      let key: number;
      for (const play of wordplays) {
         for (const i of play) {
            if (move == 1 && ((1 << i) & s.reddef) == 0) {
               s.blue = s.blue | (1 << i); // write 1 to position i
               s.red = s.red & ~(1 << i); // write 0 to position i
            } else if (move == -1 && ((1 << i) & s.bluedef) == 0) {
               s.blue = s.blue & ~(1 << i); // write  0 to position i
               s.red = s.red | (1 << i); // write 1 to position i
            }
         }
         key = this.packKey(s.blue, s.red);
         if (!scores.get(key)) {
            const score = this.evaluatePos(allLetters, s);
            scores.set(key, score);
         }
         s.red = oldred;
         s.blue = oldblue;
      }
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

   decide(
      allLetters: string,
      score: string,
      needLetters: string,
      notLetters: string,
      move: number
   ) {
      // judges the merits of possible plays for this board
      allLetters = allLetters.toUpperCase();
      const s: Score = this.convertBoardScore(score);
      let targets = 0;
      if (move == 1) {
         targets = (s.red & ~s.reddef) | (~s.blue & ~s.red);
      } else {
         targets = (s.blue & ~s.bluedef) | (~s.blue & ~s.red);
      }
      let anyl: string = '';
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
            }
         }
      }
      wordList = this.concentrate(allLetters, needLetters, notLetters, anyl);
      const wordGroups = this.groupWords(wordList, anyl);
      const plays = [];
      for (const group in wordGroups) {
         // scores formed by different arrangements of the same group
         // entries of the form [blue,red]:score
         const scores: Map<number, number> = new Map();
         this.arrange(allLetters, group, { ...s }, scores, dontuse, move);
         const groupsize = wordGroups[group]!.length;
         let blue, red;
         for (const [position, score] of scores) {
            const playscore = roundTo(score, 3);
            for (const word of wordGroups[group]!) {
               [blue, red] = this.unpackKey(position);
               plays.push(new Play(playscore, word, groupsize, blue, red));
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
                  play.group_size,
                  play.blue_map,
                  play.red_map
               );
            }
         }
      }
      return plays;
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
      if (move > 0) {
         plays.sort((a, b) => b.score - a.score);
      } else {
         plays.sort((a, b) => a.score - b.score);
      }
      return plays;
   }

   defendedMap(posmap: number): number {
      const n = this.neighbors;
      let defmap = 0;
      for (let i = 0; i < 25; i++) {
         if ((posmap & n.get(i)!) == n.get(i)) {
            defmap = defmap | (1 << i);
         }
      }
      return defmap;
   }

   endgameCheck(allLetters: string, blue: number, red: number, move: number) {
      //called by interface to check a page of search results at a time
      //purpose: an extra depth of search to check if a play loses or forces the end soon
      let zeroletters = '';
      const zeros = ~blue & ~red;
      let anyl = '';
      const bluedef = this.defendedMap(blue);
      const reddef = this.defendedMap(red);
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
         // TODO ? original Python memoized this value in this.cache[allLetters+zeroletters]
         gameendingwords = this.concentrate(allLetters, zeroletters);
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
}
