Rename the title from "Intro Prog Chat Lab" to "CodeConversa"
Create a programming tutorial for this programming environment, in Brazilian Portuguese, aimed at adolescents and older children. Use this sequence: print, delay, react, read/readNumber, variables, arithmetic, if/else, while, for (let x of range), arrays. Write a separate tutorial for canvas operations. Use Markdown to write the tutorials, so as to keep them easy to modify. Link the tutorials from the main interface.

- Use say/read or say/listen or send/receive instead of print/read?
- error feedback while writing (e.g., unmatched parens)
- global variables (doesn't need to use let)
- repl: up/down arrow to recover command history
- profile(img) to change profile picture (img can be a URL or an emoji)
- title(str) to change conversation title
- language features
  - functions
  - objects
- i18n
- canvas(w, h) - send a message with a canvas
  - drawCircle(x, y, r, color) / fillCircle
  - drawRect(x, y, w, h, color) / fillRect
  - floodFill(x, y, color)
  - drawText(x, y, text, {size, color, font}) -- the last parameter is a JS object that can contain the keys "size", "color", and "font".


  - let spr = addSprite(filename)
    - spr.x, spr.y, spr.image
  - delay(x) will wait for repaint, even if x = 0
  - image editor (a la TIC-80)
  - functions to read key state
  - concurrent model (one script per actor/sprite?), similar to Scratch
- sound (bxfr?)
