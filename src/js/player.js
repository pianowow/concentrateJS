import { roundTo, assert } from './util';

class Difficulty {
   listsize;
   unsure; // player.py calls this span limit, default value 5, but it's not not used after being defined
   wordsizelimit;
   unsure2; // player.py turn uses this to decide whether to play the best word or a randomly selected word
   constructor(listsize, unsure, wordsizelimit, unsure2) {
      this.listsize = listsize;
      this.unsure = unsure;
      this.wordsizelimit = wordsizelimit;
      this.unsure2 = unsure2;
   }
}

class Weights {
   dw; //defended weight
   uw; //undefended weight
   dpw; //defended popularity weight
   upw; //undefended popularity weight
   mw; //median weight
   constructor(dw, dpw, upw, mw) {
      this.dw = dw;
      this.uw = 1;
      this.dpw = dpw;
      this.upw = upw;
      this.mw = mw;
   }
}

class Score {
   blue = 0;
   red = 0;
   bluedef = 0;
   reddef = 0;
}

class Vector {
   x = 2;
   y = 2;
   constructor(x = 2, y = 2) {
      this.x = x;
      this.y = y;
   }
}

class Play {
   score = 0;
   word = '';
   group_size = 0;
   blue_map = 0;
   red_map = 0;
   constructor(score = 0, word = '', group_size = 0, blue_map = 0, red_map = 0) {
      this.score = score;
      this.word = word;
      this.group_size = group_size;
      this.blue_map = blue_map;
      this.red_map = red_map;
   }
}

export class Player {
   constructor(difficulty, weights) {
      this.difficulty = difficulty;
      this.weights = weights;
      this.name = 'stable - player0';
      this.neighbors = new Map();
      this.buildNeighbors();
      this.cache = Object();
      this.hashtable = Object();
   }

   static async new(
      difficulty = new Difficulty('A', 5, 25, 'S'),
      weights = new Weights(3.1, 1.28, 2.29, 7.78)
   ) {
      const p = new Player(difficulty, weights);
      await p.getWordList();
      return p;
   }

   // TODO: move to board
   saveNeighbor(square, nsquare) {
      // helper for buildNeighbors
      if (nsquare >= 0 && nsquare < 25) {
         if (this.neighbors.has(square)) {
            this.neighbors.set(square, this.neighbors.get(square) | (1 << nsquare));
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

   async getWordList() {
      try {
         let response;
         if (this.difficulty.listsize == 'A') {
            response = await fetch(new URL('word_lists/en.txt', document.baseURI));
         } // TODO: other listsizes
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         const textData = await response.text();
         this.wordList = textData
            .toUpperCase()
            .split(/\r?\n/)
            .filter((word) => word.trim());
         //.filter((word) => word.toUpperCase().trim());
      } catch (error) {
         console.error('Failed to load word list:', error);
      } //finally {
      //this.wordListIsLoading.value = false;
      // }
   }

   // roundTo(num, decimalPlaces) {
   //    const factor = Math.pow(10, decimalPlaces);
   //    return Math.round(num * factor) / factor;
   // }

   possible(letters) {
      letters = letters.toUpperCase();
      // TODO - refactor to avoid magic number 0 and 1 here
      if (this.cache[letters]) {
         return this.cache[letters][0].filter((item) => !this.cache[letters][1].includes(item));
         //so we don't suggest words that have already been played
      }
      let found = [];
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
      let d = Array(25).fill(0);
      for (const i in letters) {
         d[i] = roundTo(this.weights.dw + this.weights.dpw * (1 - letterdict[letters[i]]), 2);
      }
      // calculate undefended scores
      let u = Array(25).fill(0);
      for (let row = 0; row < 5; row++) {
         for (let col = 0; col < 5; col++) {
            let neighborList = [];
            if (row - 1 >= 0) {
               neighborList.push(letterdict[letters[(row - 1) * 5 + col]]);
            }
            if (col + 1 < 5) {
               neighborList.push(letterdict[letters[row * 5 + col + 1]]);
            }
            if (row + 1 < 5) {
               neighborList.push(letterdict[letters[(row + 1) * 5 + col]]);
            }
            if (col - 1 >= 0) {
               neighborList.push(letterdict[letters[row * 5 + col - 1]]);
            }
            let size = neighborList.length;
            for (let x = 0; x < size; x++) {
               neighborList.push(1 - letterdict[letters[row * 5 + col]]);
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

   concentrate(allLetters, needLetters = '', notLetters = '', anyLetters = '') {
      allLetters = allLetters.toUpperCase();
      needLetters = needLetters.toUpperCase();
      notLetters = notLetters.toUpperCase();
      anyLetters = anyLetters.toUpperCase();
      let possibleWords = this.possible(allLetters);
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
   convertBoardScore(scoreString) {
      // produces bitmaps from a string of characters representing the colors
      let i = 0;
      let prevchar = 'W';
      let s = new Score();
      for (const char of scoreString) {
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
               if (prevchar == 'R') {
                  s.red = s.red | (1 << i);
               } else if (prevchar == 'B') {
                  s.blue = s.blue | (1 << i);
               }
               i += 1;
            }
         } else {
            prevchar = 'W';
            i += 1;
         }
      }
      for (i = 0; i < 25; i++) {
         if ((s.blue & this.neighbors.get(i)) == this.neighbors.get(i)) {
            s.bluedef = s.bluedef | (1 << i);
         }
         if ((s.red & this.neighbors.get(i)) == this.neighbors.get(i)) {
            s.reddef = s.reddef | (1 << i);
         }
      }
      return s;
   }

   // TODO: move to util.js
   *combinations(arr, k) {
      const n = arr.length;
      if (k < 0 || k > n) return;
      const combo = new Array(k);

      function* rec(start, depth) {
         if (depth === k) {
            yield combo.slice();
            return;
         }
         // Prune so there are enough items left to fill the combo
         for (let i = start; i <= n - (k - depth); i++) {
            combo[depth] = arr[i];
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
   centroid(map) {
      let cnt = 0;
      let ysum = 0;
      let xsum = 0;
      for (let i = 0; i < 25; i++) {
         if (((1 << i) & map) > 0) {
            let y = Math.floor(i / 5);
            let x = i % 5;
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
   vectorDiff = (v1, v2) => Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);

   goalValue(goal, blue, red, move) {
      // letter popularity reduced the strength of the engine
      // centroid is more important
      let playerVector = new Vector();
      let goalVector = this.centroid(goal);
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

   computeGoal(allLetters, blue, red, move) {
      let goodGoals = [];
      const unoccupiedMap = ~(blue | red);
      let unoccupied = [];
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

   groupWords(words, anyl) {
      // groups words to limit the number of calls to arrange
      let wordGroups = Object();
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
         if (wordGroups[group]) {
            wordGroups[group].push(word);
         } else {
            wordGroups[group] = [word];
         }
      }
      return wordGroups;
   }

   evaluatePos(allLetters, s) {
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
               's.blue: ' + s.blue + ' n[i]: ' + n.get(i) + ' s.blue&n[i]: ' + (s.blue & n.get(i));
               if ((s.blue & n.get(i)) == n.get(i)) {
                  blueScore += d[i];
               } else {
                  blueScore += u[i];
               }
            }
            if (s.red & (1 << i)) {
               if ((s.red & n.get(i)) == n.get(i)) {
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

   arrange(allLetters, word, s, scores = new Map(), avoidIndexes = [], move = 1) {
      // function to evaluate all placements of a word
      // for each unique letter, get a list of lists for the indexes it can be played in
      let wordhist = Object();
      for (const letter of word) {
         wordhist[letter] = word.split(letter).length - 1;
      }
      let letteroptions = [];
      for (const letter in wordhist) {
         let letterplaces = [];
         for (const i in allLetters) {
            const letter2 = allLetters.charAt(i);
            if (letter == letter2 && avoidIndexes.indexOf(i) < 0) {
               //letter matches and we weren't told to avoid this spot
               letterplaces.push(i);
            }
         }
         let letterCombos = [];
         for (const combo of this.combinations(letterplaces, wordhist[letter])) {
            letterCombos.push(combo);
         }
         letteroptions.push(letterCombos);
      }
      // create a new list with enough elements to hold all the options above (multiply the length of all the lists)
      let lenwordplays = 1;
      for (const lst of letteroptions) {
         lenwordplays *= lst.length;
      }
      let wordplays = Array(lenwordplays)
         .fill(null)
         .map(() => []);
      // write the options to wordPlays to get all the ways to play this word
      // [[[1,],[2]],[[3,4],[3,5],[4,5]]] becomes [[1,3,4],[1,3,5],[1,4,5],[2,3,4],[2,3,5],[2,4,5]]
      let divisor = 1;
      for (const letterplays of letteroptions) {
         divisor *= letterplays.length;
         const cutoff = Math.floor(lenwordplays / divisor);
         if (letterplays.length > 1) {
            for (let playindex = 0; playindex < lenwordplays; playindex++) {
               const lookup = Math.floor(playindex / cutoff) % letterplays.length;
               for (const index of letterplays[lookup]) {
                  wordplays[playindex].push(index);
               }
            }
         } else {
            for (const i of letterplays[0]) {
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
         if (!scores.get([s.blue, s.red])) {
            const score = this.evaluatePos(allLetters, s);
            scores.set([s.blue, s.red], score);
         }
         s.red = oldred;
         s.blue = oldblue;
      }
   }

   playIsSafe(group, play) {
      // determines whether playing a member of a group is safe,
      // that is, it would not allow the opponent to play the last word of this group
      assert(group.indexOf(play) >= 0, 'playIsSafe: play not found in group');
      let newgroup = [];
      for (let word of group) {
         let length = word.length;
         if (play.slice(0, length) != word) {
            newgroup.push(word);
         }
      }
      group = newgroup;
      const category = { single: 0, double: 0, big: 0 };
      newgroup.sort((a, b) => a.length - b.length);

      const children = new Set();

      for (let i = 0; i < newgroup.length; i++) {
         const word1 = newgroup[i];
         if (children.has(word1)) continue;

         const len1 = word1.length;
         const mychildren = [];

         // Collect direct children: longer words starting with word1
         for (let j = i + 1; j < newgroup.length; j++) {
            const word2 = newgroup[j];
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
               const child1 = mychildren[k];
               const lenChild1 = child1.length;
               for (let m = k + 1; m < mychildren.length; m++) {
                  const child2 = mychildren[m];
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

   decide(allLetters, score, needLetters, notLetters, move) {
      // judges the merits of possible plays for this board
      allLetters = allLetters.toUpperCase();
      let s = this.convertBoardScore(score);
      let targets = 0;
      if (move == 1) {
         targets = (s.red & ~s.reddef) | (~s.blue & ~s.red);
      } else {
         targets = (s.blue & ~s.bluedef) | (~s.blue & ~s.red);
      }
      let anyl = '';
      let dontuse = [];
      let goal = 0;
      let maxWordSize = 0;
      let wordList = [];
      // find goal for notLetters (if none given already)
      if (!notLetters && !needLetters) {
         wordList = this.possible(allLetters);
         for (const word in wordList) {
            if (word.length > maxWordSize) maxWordSize = word.length;
         }
         if (maxWordSize < 13) {
            // based on testing goal vs flexible version
            goal = this.computeGoal(allLetters, s.blue, s.red, move);
         }
         for (const i in allLetters) {
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
         for (const i in allLetters) {
            const letter = allLetters.charAt(i);
            if ((1 << i) & targets) {
               anyl += letter;
            }
         }
      }
      wordList = this.concentrate(allLetters, needLetters, notLetters, anyl);
      const wordGroups = this.groupWords(wordList, anyl);
      let plays = [];
      for (const group in wordGroups) {
         // scores formed by different arrangements of the same group
         // entries of the form [blue,red]:score
         let scores = new Map();
         this.arrange(allLetters, group, { ...s }, scores, dontuse, move);
         const groupsize = wordGroups[group].length;
         for (let [position, score] of scores) {
            const playscore = roundTo(score, 3);
            for (const word of wordGroups[group]) {
               plays.push(new Play(playscore, word, groupsize, position[0], position[1]));
            }
         }
      }
      let bestScore = 0;
      let inc;
      if (move == 1 && plays.length > 0) {
         bestScore = Math.max(...plays.map((play) => play.score));
         inc = 0.0005;
      } else if (move == -1 && plays.length > 0) {
         bestScore = Math.min(...plays.map((play) => play.score));
         inc = -0.0005;
      } else {
         return plays;
      }
      // we'd like to play the last word of the best group, so check which plays are safe of the best group
      let bestPlays = new Map();
      if (Math.abs(bestScore) < 1000) {
         for (let [i, play] of plays.entries()) {
            if (play.score == bestScore) {
               bestPlays.set(i, play);
            }
         }
         let bestGroup = [...bestPlays.values().map((play) => play.word)];
         for (let [i, play] of bestPlays) {
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

   search(allLetters, score, needLetters, notLetters, move) {
      let plays = this.decide(allLetters, score, needLetters, notLetters, move);
      // TODO (?) implement random difficulty
      if (move > 0) {
         plays.sort((a, b) => b.score - a.score);
      } else {
         plays.sort((a, b) => a.score - b.score);
      }
      return plays;
   }
}
