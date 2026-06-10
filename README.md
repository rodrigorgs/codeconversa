# Intro Prog Chat Lab

A browser-based teaching environment for small JavaScript-like programs that behave like conversational apps.

## Run

```sh
npm install
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

The code editor uses CodeMirror, installed locally through npm so the page can run without a CDN dependency.

The Save button stores the current source code in this browser's `localStorage`. `Ctrl+S` and `Cmd+S` also save, and Run saves before starting the program. When the page reloads, the editor restores the last saved code. A `*` beside Save means the current editor contents are not saved. The Example button opens the example picker and asks for confirmation before replacing the editor contents.

## Current Language

The app intentionally runs a beginner subset through its own interpreter instead of evaluating code directly. It supports:

- `let`, `const`, and `var` declarations
- assignments
- strings, numbers, booleans, and `null`
- string length, indexes, and safe string methods such as `text.length`, `text[0]`, and `text.toUpperCase()`
- array literals with square brackets, such as `["Yes", "No"]`
- array indexes, array assignment, and array length, such as `items[0]`, `items[1] = "Hi"`, and `items.length`
- arithmetic and comparison expressions
- `if (...) { ... } else { ... }`
- `while (...) { ... }`
- `for (let i = 0; i < 3; i++) { ... }`
- canvas drawing with the most recently created canvas
- calls to the built-in teaching functions

Available built-ins:

- `print(...values)`
- `read(question)`
- `readNumber(question)`
- `readChoice(question, options)`
- `react(value)`
- `delay(seconds)`
- `canvas(width, height)`
- `clear(color)`
- `drawLine(x1, y1, x2, y2, color)`
- `randomInt(min, max)`

`canvas(width, height)` sends a canvas message to the chat and remembers it as the current drawing target. `clear(color)` paints the current canvas with a CSS color string, or makes it transparent when no color is provided. `drawLine(...)` draws on the most recent canvas. Large canvases are visually scaled to fit the chat while keeping their original coordinate system.

Supported string methods:

- `toUpperCase()`, `toLowerCase()`
- `trim()`, `trimStart()`, `trimEnd()`
- `includes(text)`, `startsWith(text)`, `endsWith(text)`
- `indexOf(text)`, `lastIndexOf(text)`
- `slice(start, end)`, `substring(start, end)`
- `replace(text, replacement)`, `replaceAll(text, replacement)`
- `repeat(count)`, `charAt(index)`, `at(index)`
- `concat(...parts)`, `padStart(length, fill)`, `padEnd(length, fill)`
- `split(separator)`

Browser async APIs such as `async`, `await`, `Promise`, `fetch`, and timers are rejected. `read()` and `readNumber()` look synchronous to the student, while the interpreter internally pauses until the chat message box receives an answer.
