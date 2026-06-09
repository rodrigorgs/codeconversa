# Intro Prog Chat Lab

A browser-based teaching environment for small JavaScript-like programs that behave like conversational apps.

## Run

```sh
npm install
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The code editor uses CodeMirror, installed locally through npm so the page can run without a CDN dependency.

## Current Language

The app intentionally runs a beginner subset through its own interpreter instead of evaluating code directly. It supports:

- `let`, `const`, and `var` declarations
- assignments
- strings, numbers, booleans, and `null`
- arithmetic and comparison expressions
- calls to the built-in teaching functions

Available built-ins:

- `print(...values)`
- `read(question)`
- `readNumber(question)`
- `randomInt(min, max)`
- `clear()`

Browser async APIs such as `async`, `await`, `Promise`, `fetch`, and timers are rejected. `read()` and `readNumber()` look synchronous to the student, while the interpreter internally pauses until the chat message box receives an answer.
