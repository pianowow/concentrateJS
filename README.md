# Concentrate

Live version here: [Concentrate](https://pianowow.github.io/concentrate/)

This is a solver for [Letterpress](<https://en.wikipedia.org/wiki/Letterpress_(video_game)>), a turn-based word game for iOS/Android. The strength of the algorithm was honed over time with machine learning. It learned to play better by remembering which strategies won more often in games it played vs itself.

Originally this was a [desktop app written in Python](https://github.com/pianowow/concentratePy). But now it's this single page web app.

## Development notes:

Written on the Vue.js framework with Vite.
IDE: [VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

Setup:

```sh
npm install
```

Compile and Hot-Reload for Development:

```sh
npm run dev
```

Run unit tests in real time with web UI:

```sh
npm run test:ui
```

Compile and Minify for Production:

```sh
npm run build
```

Lint with [ESLint](https://eslint.org/):

```sh
npm run lint
```
