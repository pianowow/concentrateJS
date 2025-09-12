class Difficulty {
   listsize;
   unsure;
   wordsizelimit;
   unsure2;
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

export class Player {
   constructor(
      difficulty = new Difficulty('A', 5, 25, 'S'),
      weights = new Weights(3.1, 1.28, 2.29, 7.78)
   ) {
      this.difficulty = difficulty;
      this.weights = weights;
      this.name = 'stable - player0';
   }

   async get_word_list() {
      try {
         let response;
         if (this.difficulty.listsize == 'A') {
            response = await fetch('/word_lists/en.txt');
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

   contains(bigger, smaller) {
      //check if every letter of smaller is in bigger
      let good = true;
      for (const letter of smaller) {
         if (bigger.split(letter).length < smaller.split(letter).length) {
            good = false;
            break;
         }
      }
      return good;
   }

   possible(letters) {
      letters = letters.toUpperCase();
      let found = [];
      const wordsizelimit = this.difficulty.wordsizelimit;
      for (const candidate of this.wordList.filter((word) => word.length < wordsizelimit)) {
         if (this.contains(letters, candidate)) {
            found.push(candidate);
         }
      }
      return found;
      // original function also calculated the value of each letter on the board, defended and undefended
      // then it saved off the valid word plays and the value of each letter in a cache dictionary
      // TODO implement / refactor this logic
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
}
