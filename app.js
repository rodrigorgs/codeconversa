(function () {
  const starterCode = `let name = read("What's your name?")
react("👋")
print("Hi", name)
print("Your name in uppercase is", name.toUpperCase())
print("Your name has", name.length, "letters")
let age = readNumber("How old are you?")
react("👍")
if (age >= 13) {
  print("You are a teenager.")
} else {
  print("You are", age, "years old.")
}
for (let i = 1; i <= 3; i++) {
  delay(1)
  print("Count", i)
}
let countdown = 3
while (countdown > 0) {
  print("Countdown", countdown)
  countdown--
}
let mood = readChoice("How are you feeling?", ["Great", "Okay", "Tired"])
react("✅")
print("Mood:", mood)
let colors = ["red", "green", "blue"]
print("First color:", colors[0])
print("There are", colors.length, "colors")`;

  const maxLoopIterations = 10000;

  const forbiddenWords = new Set([
    "async",
    "await",
    "Promise",
    "fetch",
    "setTimeout",
    "setInterval",
    "XMLHttpRequest",
    "addEventListener",
    "document",
    "window",
    "eval",
    "Function",
  ]);

  const elements = {
    workspace: document.getElementById("workspace"),
    source: document.getElementById("source-editor"),
    messages: document.getElementById("messages"),
    messageForm: document.getElementById("message-form"),
    choiceList: document.getElementById("choice-list"),
    messageInput: document.getElementById("message-input"),
    sendButton: document.getElementById("send-button"),
    runButton: document.getElementById("run-button"),
    stepButton: document.getElementById("step-button"),
    stopButton: document.getElementById("stop-button"),
    resetButton: document.getElementById("reset-button"),
    status: document.getElementById("runner-status"),
    variables: document.getElementById("variables"),
    executionState: document.getElementById("execution-state"),
    replLog: document.getElementById("repl-log"),
    replForm: document.getElementById("repl-form"),
    replCommand: document.getElementById("repl-command"),
    toggleLeft: document.getElementById("toggle-left"),
    toggleMiddle: document.getElementById("toggle-middle"),
    toggleRight: document.getElementById("toggle-right"),
  };

  class TokenStream {
    constructor(tokens) {
      this.tokens = tokens;
      this.index = 0;
    }

    peek() {
      return this.tokens[this.index] || { type: "eof", value: "" };
    }

    next() {
      return this.tokens[this.index++] || { type: "eof", value: "" };
    }

    match(value) {
      if (this.peek().value === value) {
        this.next();
        return true;
      }
      return false;
    }

    expect(value) {
      const token = this.next();
      if (token.value !== value) {
        throw new Error(`Expected "${value}", found "${token.value || "end of expression"}".`);
      }
      return token;
    }
  }

  function tokenizeExpression(source) {
    const tokens = [];
    let index = 0;

    while (index < source.length) {
      const char = source[index];

      if (/\s/.test(char)) {
        index += 1;
        continue;
      }

      if (char === '"' || char === "'") {
        const quote = char;
        let value = "";
        index += 1;
        while (index < source.length && source[index] !== quote) {
          if (source[index] === "\\") {
            index += 1;
            const escaped = source[index];
            const escapes = { n: "\n", t: "\t", r: "\r" };
            value += escapes[escaped] || escaped || "";
            index += 1;
          } else {
            value += source[index];
            index += 1;
          }
        }
        if (source[index] !== quote) {
          throw new Error("Unclosed string.");
        }
        index += 1;
        tokens.push({ type: "string", value });
        continue;
      }

      if (/\d/.test(char)) {
        let raw = char;
        index += 1;
        while (index < source.length && /[\d.]/.test(source[index])) {
          raw += source[index];
          index += 1;
        }
        const value = Number(raw);
        if (Number.isNaN(value)) {
          throw new Error(`Invalid number "${raw}".`);
        }
        tokens.push({ type: "number", value });
        continue;
      }

      if (/[A-Za-z_$]/.test(char)) {
        let value = char;
        index += 1;
        while (index < source.length && /[A-Za-z0-9_$]/.test(source[index])) {
          value += source[index];
          index += 1;
        }
        if (forbiddenWords.has(value)) {
          throw new Error(`"${value}" is not available here. Use the built-in beginner functions instead.`);
        }
        tokens.push({ type: "identifier", value });
        continue;
      }

      const pair = source.slice(index, index + 2);
      if (["==", "!=", "<=", ">=", "&&", "||", "++", "--"].includes(pair)) {
        tokens.push({ type: "operator", value: pair });
        index += 2;
        continue;
      }

      if ("+-*/%<>=!,()[].".includes(char)) {
        tokens.push({ type: "operator", value: char });
        index += 1;
        continue;
      }

      throw new Error(`Unexpected character "${char}".`);
    }

    tokens.push({ type: "eof", value: "" });
    return tokens;
  }

  function parseExpression(source) {
    const stream = new TokenStream(tokenizeExpression(source));
    const expression = parseBinary(stream, 0);
    if (stream.peek().type !== "eof") {
      throw new Error(`Unexpected "${stream.peek().value}".`);
    }
    return expression;
  }

  const precedence = {
    "||": 1,
    "&&": 2,
    "==": 3,
    "!=": 3,
    "<": 4,
    ">": 4,
    "<=": 4,
    ">=": 4,
    "+": 5,
    "-": 5,
    "*": 6,
    "/": 6,
    "%": 6,
  };

  function parseBinary(stream, minPrecedence) {
    let left = parseUnary(stream);

    while (true) {
      const operator = stream.peek().value;
      const rank = precedence[operator];
      if (!rank || rank < minPrecedence) {
        break;
      }
      stream.next();
      const right = parseBinary(stream, rank + 1);
      left = { type: "binary", operator, left, right };
    }

    return left;
  }

  function parseUnary(stream) {
    const token = stream.peek();
    if (["!", "-", "+"].includes(token.value)) {
      stream.next();
      return { type: "unary", operator: token.value, argument: parseUnary(stream) };
    }
    return parsePrimary(stream);
  }

  function parsePrimary(stream) {
    const token = stream.next();
    let expression = null;

    if (token.type === "number" || token.type === "string") {
      expression = { type: "literal", value: token.value };
    } else if (token.type === "identifier") {
      if (token.value === "true" || token.value === "false") {
        expression = { type: "literal", value: token.value === "true" };
      } else if (token.value === "null") {
        expression = { type: "literal", value: null };
      } else {
        expression = { type: "identifier", name: token.value };
      }
    } else if (token.value === "(") {
      expression = parseBinary(stream, 0);
      stream.expect(")");
    } else if (token.value === "[") {
      const elements = [];
      if (!stream.match("]")) {
        do {
          elements.push(parseBinary(stream, 0));
        } while (stream.match(","));
        stream.expect("]");
      }
      expression = { type: "array", elements };
    } else {
      throw new Error(`Unexpected "${token.value || "end of expression"}".`);
    }

    return parsePostfix(expression, stream);
  }

  function parsePostfix(expression, stream) {
    while (true) {
      while (stream.match("(")) {
        const args = [];
        if (!stream.match(")")) {
          do {
            args.push(parseBinary(stream, 0));
          } while (stream.match(","));
          stream.expect(")");
        }
        expression = { type: "call", callee: expression, args };
      }

      if (stream.match("[")) {
        const index = parseBinary(stream, 0);
        stream.expect("]");
        expression = { type: "index", object: expression, index };
        continue;
      }

      if (stream.match(".")) {
        const property = stream.next();
        if (property.type !== "identifier") {
          throw new Error("Expected a property name after '.'.");
        }
        expression = { type: "member", object: expression, property: property.value };
        continue;
      }

      break;
    }

    return expression;
  }

  function parseStatement(line, lineNumber = 1) {
    const declaration = line.match(/^(let|const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(.+)$/);
    if (declaration) {
      const [, kind, name, expression] = declaration;
      if (forbiddenWords.has(name)) {
        throw new Error(`"${name}" cannot be used as a variable name.`);
      }
      return { type: "declaration", kind, name, expression: parseExpression(expression), source: line, lineNumber };
    }

    const increment = line.match(/^([A-Za-z_$][A-Za-z0-9_$]*)(\+\+|--)$/);
    if (increment) {
      const [, name, operator] = increment;
      return { type: "increment", name, operator, source: line, lineNumber };
    }

    const assignmentIndex = findTopLevelAssignment(line);
    if (assignmentIndex > -1) {
      const targetSource = line.slice(0, assignmentIndex).trim();
      const expressionSource = line.slice(assignmentIndex + 1).trim();
      if (!targetSource || !expressionSource) {
        throw new Error("Assignment needs something on both sides of '='.");
      }
      const target = parseExpression(targetSource);
      if (target.type === "identifier") {
        return {
          type: "assignment",
          name: target.name,
          expression: parseExpression(expressionSource),
          source: line,
          lineNumber,
        };
      }
      if (target.type === "index") {
        return {
          type: "indexAssignment",
          target,
          expression: parseExpression(expressionSource),
          source: line,
          lineNumber,
        };
      }
      throw new Error("Only variables and array positions can be assigned.");
    }

    const assignment = line.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(.+)$/);
    if (assignment) {
      const [, name, expression] = assignment;
      return { type: "assignment", name, expression: parseExpression(expression), source: line, lineNumber };
    }

    return { type: "expression", expression: parseExpression(line), source: line, lineNumber };
  }

  class ProgramParser {
    constructor(source) {
      this.source = source;
      this.index = 0;
    }

    parseProgram() {
      const statements = this.parseStatements(false);
      this.skipWhitespaceAndComments();
      if (!this.isAtEnd()) {
        throw new Error(`Unexpected "${this.peek()}".`);
      }
      return statements;
    }

    parseStatements(stopAtBrace) {
      const statements = [];
      while (!this.isAtEnd()) {
        this.skipWhitespaceAndComments();
        if (this.isAtEnd()) {
          break;
        }
        if (this.peek() === "}") {
          if (stopAtBrace) {
            break;
          }
          throw new Error("Unexpected closing brace.");
        }
        statements.push(this.parseNextStatement(statements.length + 1));
      }
      return statements;
    }

    parseNextStatement(lineNumber) {
      if (this.matchWord("if")) {
        return this.parseIf(lineNumber);
      }
      if (this.matchWord("while")) {
        return this.parseWhile(lineNumber);
      }
      if (this.matchWord("for")) {
        return this.parseFor(lineNumber);
      }
      return parseStatement(this.readSimpleStatement(), lineNumber);
    }

    parseIf(lineNumber) {
      const condition = parseExpression(this.readParenthesized("if"));
      const consequent = this.readBlock("if");
      this.skipWhitespaceAndComments();
      let alternate = [];
      if (this.matchWord("else")) {
        this.skipWhitespaceAndComments();
        if (this.matchWord("if")) {
          alternate = [this.parseIf(lineNumber)];
        } else {
          alternate = this.readBlock("else");
        }
      }
      return {
        type: "if",
        condition,
        consequent,
        alternate,
        source: "if (...)",
        lineNumber,
      };
    }

    parseWhile(lineNumber) {
      const condition = parseExpression(this.readParenthesized("while"));
      const body = this.readBlock("while");
      return { type: "while", condition, body, source: "while (...)", lineNumber };
    }

    parseFor(lineNumber) {
      const header = splitForHeader(this.readParenthesized("for"));
      const [initSource, conditionSource, updateSource] = header;
      const init = initSource.trim() ? parseStatement(initSource.trim(), lineNumber) : null;
      const condition = conditionSource.trim() ? parseExpression(conditionSource.trim()) : { type: "literal", value: true };
      const update = updateSource.trim() ? parseStatement(updateSource.trim(), lineNumber) : null;
      const body = this.readBlock("for");
      return { type: "for", init, condition, update, body, source: "for (...)", lineNumber };
    }

    readParenthesized(label) {
      this.skipWhitespaceAndComments();
      if (this.peek() !== "(") {
        throw new Error(`${label} needs parentheses around its condition.`);
      }
      return this.readBalanced("(", ")");
    }

    readBlock(label) {
      this.skipWhitespaceAndComments();
      if (this.peek() !== "{") {
        throw new Error(`${label} needs a block with braces.`);
      }
      this.index += 1;
      const statements = this.parseStatements(true);
      this.skipWhitespaceAndComments();
      if (this.peek() !== "}") {
        throw new Error(`Missing closing brace for ${label}.`);
      }
      this.index += 1;
      this.consumeStatementSeparators();
      return statements;
    }

    readSimpleStatement() {
      let text = "";
      let quote = null;
      let escaped = false;
      let parens = 0;
      let brackets = 0;

      while (!this.isAtEnd()) {
        const char = this.peek();

        if (quote) {
          text += char;
          this.index += 1;
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === quote) {
            quote = null;
          }
          continue;
        }

        if (char === '"' || char === "'") {
          quote = char;
          text += char;
          this.index += 1;
          continue;
        }

        if (char === "(") {
          parens += 1;
          text += char;
          this.index += 1;
          continue;
        }

        if (char === ")") {
          parens -= 1;
          text += char;
          this.index += 1;
          continue;
        }

        if (char === "[") {
          brackets += 1;
          text += char;
          this.index += 1;
          continue;
        }

        if (char === "]") {
          brackets -= 1;
          text += char;
          this.index += 1;
          continue;
        }

        if ((char === "\n" || char === ";") && parens === 0 && brackets === 0) {
          this.index += 1;
          break;
        }

        if (char === "}" && parens === 0 && brackets === 0) {
          break;
        }

        text += char;
        this.index += 1;
      }

      if (quote) {
        throw new Error("Unclosed string.");
      }

      const statement = text.trim();
      if (!statement) {
        throw new Error("Expected a statement.");
      }
      return statement;
    }

    readBalanced(open, close) {
      let text = "";
      let depth = 0;
      let quote = null;
      let escaped = false;

      while (!this.isAtEnd()) {
        const char = this.peek();
        this.index += 1;

        if (quote) {
          if (escaped) {
            escaped = false;
          } else if (char === "\\") {
            escaped = true;
          } else if (char === quote) {
            quote = null;
          }
          text += char;
          continue;
        }

        if (char === '"' || char === "'") {
          quote = char;
          text += char;
          continue;
        }

        if (char === open) {
          depth += 1;
          if (depth > 1) {
            text += char;
          }
          continue;
        }

        if (char === close) {
          depth -= 1;
          if (depth === 0) {
            return text;
          }
          text += char;
          continue;
        }

        text += char;
      }

      throw new Error(`Missing "${close}".`);
    }

    skipWhitespaceAndComments() {
      while (!this.isAtEnd()) {
        if (/\s/.test(this.peek())) {
          this.index += 1;
          continue;
        }
        if (this.source.slice(this.index, this.index + 2) === "//") {
          while (!this.isAtEnd() && this.peek() !== "\n") {
            this.index += 1;
          }
          continue;
        }
        break;
      }
    }

    consumeStatementSeparators() {
      while (!this.isAtEnd() && (this.peek() === ";" || this.peek() === "\n")) {
        this.index += 1;
      }
    }

    matchWord(word) {
      this.skipWhitespaceAndComments();
      if (this.source.slice(this.index, this.index + word.length) !== word) {
        return false;
      }
      const before = this.source[this.index - 1] || "";
      const after = this.source[this.index + word.length] || "";
      if (/[A-Za-z0-9_$]/.test(before) || /[A-Za-z0-9_$]/.test(after)) {
        return false;
      }
      this.index += word.length;
      return true;
    }

    peek() {
      return this.source[this.index];
    }

    isAtEnd() {
      return this.index >= this.source.length;
    }
  }

  function splitForHeader(header) {
    const parts = [];
    let current = "";
    let quote = null;
    let escaped = false;
    let parens = 0;
    let brackets = 0;

    for (const char of header) {
      if (quote) {
        current += char;
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        current += char;
        continue;
      }

      if (char === "(") {
        parens += 1;
        current += char;
        continue;
      }

      if (char === ")") {
        parens -= 1;
        current += char;
        continue;
      }

      if (char === "[") {
        brackets += 1;
        current += char;
        continue;
      }

      if (char === "]") {
        brackets -= 1;
        current += char;
        continue;
      }

      if (char === ";" && parens === 0 && brackets === 0) {
        parts.push(current);
        current = "";
        continue;
      }

      current += char;
    }

    parts.push(current);
    if (parts.length !== 3) {
      throw new Error("for needs three parts: start; condition; update.");
    }
    return parts;
  }

  function findTopLevelAssignment(line) {
    let quote = null;
    let escaped = false;
    let parens = 0;
    let brackets = 0;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = null;
        }
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }

      if (char === "(") {
        parens += 1;
        continue;
      }

      if (char === ")") {
        parens -= 1;
        continue;
      }

      if (char === "[") {
        brackets += 1;
        continue;
      }

      if (char === "]") {
        brackets -= 1;
        continue;
      }

      if (char === "=" && parens === 0 && brackets === 0) {
        const previous = line[index - 1] || "";
        const next = line[index + 1] || "";
        if (previous !== "=" && previous !== "!" && previous !== "<" && previous !== ">" && next !== "=") {
          return index;
        }
      }
    }

    return -1;
  }

  function parseProgram(source) {
    for (const word of forbiddenWords) {
      const pattern = new RegExp(`\\b${word}\\b`);
      if (pattern.test(source)) {
        throw new Error(`"${word}" is not available here. Programs in this lab use simple, synchronous-looking code.`);
      }
    }
    return new ProgramParser(source).parseProgram();
  }

  class Environment {
    constructor(parent = null) {
      this.parent = parent;
      this.values = new Map();
    }

    declare(name, value) {
      this.values.set(name, value);
    }

    assign(name, value) {
      if (this.values.has(name)) {
        this.values.set(name, value);
        return;
      }
      if (this.parent) {
        this.parent.assign(name, value);
        return;
      }
      throw new Error(`Variable "${name}" has not been created yet.`);
    }

    get(name) {
      if (this.values.has(name)) {
        return this.values.get(name);
      }
      if (this.parent) {
        return this.parent.get(name);
      }
      throw new Error(`Variable "${name}" does not exist yet.`);
    }

    snapshot() {
      const result = this.parent ? this.parent.snapshot() : {};
      for (const [key, value] of this.values.entries()) {
        result[key] = value;
      }
      return result;
    }
  }

  class ChatRuntime {
    constructor() {
      this.pendingRead = null;
      this.pendingDelay = null;
      this.lastUserBubble = null;
    }

    print(...values) {
      addMessage("app", values.map(formatOutput).join(" "));
      return undefined;
    }

    clear() {
      elements.messages.innerHTML = "";
      this.lastUserBubble = null;
      return undefined;
    }

    react(value) {
      if (!this.lastUserBubble || !this.lastUserBubble.isConnected) {
        addMessage("error", "There is no user message to react to yet.");
        return undefined;
      }
      const reaction = String(value ?? "").trim();
      if (!reaction.trim()) {
        addMessage("error", "react(value) needs a visible reaction.");
        return undefined;
      }

      const previous = this.lastUserBubble.querySelector(".reaction-chip");
      if (previous) {
        previous.remove();
      }

      const chip = document.createElement("span");
      chip.className = "reaction-chip";
      if (getGraphemeCount(reaction) === 1) {
        chip.classList.add("is-single");
      }
      chip.textContent = reaction;
      this.lastUserBubble.appendChild(chip);
      elements.messages.scrollTop = elements.messages.scrollHeight;
      return reaction;
    }

    delay(seconds) {
      const duration = Number(seconds);
      if (!Number.isFinite(duration) || duration < 0) {
        throw new Error("delay(seconds) needs a number of seconds.");
      }

      const typingBubble = addTypingBubble();
      setStatus("Typing");

      return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
          typingBubble.remove();
          this.pendingDelay = null;
          setStatus("Ready");
          resolve(undefined);
        }, duration * 1000);
        this.pendingDelay = { timeoutId, typingBubble, reject };
      });
    }

    read(question, mode, hasQuestion) {
      if (this.pendingRead) {
        throw new Error("The program is already waiting for an answer.");
      }

      if (hasQuestion) {
        addMessage("app", String(question ?? ""));
      }
      setStatus(mode === "number" ? "Waiting for a number" : "Waiting for an answer");
      showMessageBox(mode === "number" ? "Type a number..." : "Type your answer...");

      return new Promise((resolve, reject) => {
        this.pendingRead = { mode, resolve, reject };
      });
    }

    readChoice(question, options, hasQuestion) {
      if (this.pendingRead) {
        throw new Error("The program is already waiting for an answer.");
      }

      if (!Array.isArray(options)) {
        throw new Error("readChoice(question, options) needs options in square brackets, like [\"Yes\", \"No\"].");
      }

      if (!options.length) {
        throw new Error("readChoice needs at least one option.");
      }

      if (hasQuestion) {
        addMessage("app", String(question ?? ""));
      }
      setStatus("Waiting for a choice");

      return new Promise((resolve, reject) => {
        this.pendingRead = { mode: "choice", resolve, reject };
        showChoiceBox(options, (value) => this.receiveChoice(value));
      });
    }

    receive(raw) {
      if (!this.pendingRead) {
        return;
      }
      const pending = this.pendingRead;
      const trimmed = raw.trim();
      this.lastUserBubble = addMessage("user", raw);

      if (pending.mode === "number") {
        const value = Number(trimmed.replace(",", "."));
        if (!trimmed || Number.isNaN(value)) {
          addMessage("error", "Please type a valid number.");
          elements.messageInput.focus();
          return;
        }
        this.pendingRead = null;
        disableMessageBox();
        setStatus("Ready");
        pending.resolve(value);
        return;
      }

      this.pendingRead = null;
      disableMessageBox();
      setStatus("Ready");
      pending.resolve(raw);
    }

    receiveChoice(value) {
      if (!this.pendingRead || this.pendingRead.mode !== "choice") {
        return;
      }
      const pending = this.pendingRead;
      this.lastUserBubble = addMessage("user", String(value));
      this.pendingRead = null;
      disableMessageBox();
      setStatus("Ready");
      pending.resolve(value);
    }

    cancel() {
      if (this.pendingRead) {
        const pending = this.pendingRead;
        this.pendingRead = null;
        disableMessageBox();
        pending.reject(new Error("Program stopped."));
      }
      if (this.pendingDelay) {
        const pending = this.pendingDelay;
        window.clearTimeout(pending.timeoutId);
        pending.typingBubble.remove();
        this.pendingDelay = null;
        pending.reject(new Error("Program stopped."));
      }
    }
  }

  class Interpreter {
    constructor(runtime, env) {
      this.runtime = runtime;
      this.env = env;
      this.program = [];
      this.position = 0;
      this.running = false;
      this.cancelled = false;
      this.lastResult = undefined;
    }

    load(source) {
      this.program = parseProgram(source);
      this.position = 0;
      this.cancelled = false;
      this.lastResult = undefined;
      updateInspector(this);
    }

    resetEnv() {
      this.env = new Environment();
      this.position = 0;
      this.running = false;
      this.cancelled = false;
      this.lastResult = undefined;
      updateInspector(this);
    }

    stop() {
      this.cancelled = true;
      this.running = false;
      this.runtime.cancel();
      setStatus("Stopped");
      updateInspector(this);
    }

    async runAll() {
      if (this.running) {
        return;
      }
      this.running = true;
      this.cancelled = false;
      setStatus("Running");
      try {
        while (this.position < this.program.length && !this.cancelled) {
          await this.stepOnce();
        }
        if (!this.cancelled) {
          setStatus("Ready");
          addMessage("system", "Program finished.");
        }
      } catch (error) {
        addMessage("error", error.message);
        setStatus("Error");
      } finally {
        this.running = false;
        updateInspector(this);
      }
    }

    async stepFromButton() {
      if (this.running) {
        return;
      }
      this.running = true;
      this.cancelled = false;
      setStatus("Stepping");
      try {
        if (this.position < this.program.length) {
          await this.stepOnce();
          setStatus("Ready");
        } else {
          setStatus("Ready");
        }
      } catch (error) {
        addMessage("error", error.message);
        setStatus("Error");
      } finally {
        this.running = false;
        updateInspector(this);
      }
    }

    async stepOnce() {
      if (this.cancelled || this.position >= this.program.length) {
        return;
      }
      const statement = this.program[this.position];
      this.position += 1;
      this.lastResult = await this.execute(statement);
      updateInspector(this, statement);
    }

    async executeBlock(statements) {
      let result = undefined;
      for (const statement of statements) {
        if (this.cancelled) {
          break;
        }
        result = await this.execute(statement);
        this.lastResult = result;
        updateInspector(this, statement);
      }
      return result;
    }

    async execute(statement) {
      if (statement.type === "declaration") {
        const value = await evaluate(statement.expression, this.env, this.runtime);
        this.env.declare(statement.name, value);
        return value;
      }
      if (statement.type === "assignment") {
        const value = await evaluate(statement.expression, this.env, this.runtime);
        this.env.assign(statement.name, value);
        return value;
      }
      if (statement.type === "indexAssignment") {
        const object = await evaluate(statement.target.object, this.env, this.runtime);
        const index = await evaluate(statement.target.index, this.env, this.runtime);
        const value = await evaluate(statement.expression, this.env, this.runtime);
        setArrayIndex(object, index, value);
        return value;
      }
      if (statement.type === "increment") {
        const current = this.env.get(statement.name);
        if (typeof current !== "number") {
          throw new Error(`Variable "${statement.name}" must be a number to use ${statement.operator}.`);
        }
        const value = statement.operator === "++" ? current + 1 : current - 1;
        this.env.assign(statement.name, value);
        return value;
      }
      if (statement.type === "if") {
        const condition = await evaluate(statement.condition, this.env, this.runtime);
        return this.executeBlock(condition ? statement.consequent : statement.alternate);
      }
      if (statement.type === "while") {
        let result = undefined;
        let iterations = 0;
        while ((await evaluate(statement.condition, this.env, this.runtime)) && !this.cancelled) {
          iterations += 1;
          if (iterations > maxLoopIterations) {
            throw new Error(`Loop stopped after ${maxLoopIterations} iterations.`);
          }
          result = await this.executeBlock(statement.body);
        }
        return result;
      }
      if (statement.type === "for") {
        let result = undefined;
        let iterations = 0;
        if (statement.init) {
          await this.execute(statement.init);
        }
        while ((await evaluate(statement.condition, this.env, this.runtime)) && !this.cancelled) {
          iterations += 1;
          if (iterations > maxLoopIterations) {
            throw new Error(`Loop stopped after ${maxLoopIterations} iterations.`);
          }
          result = await this.executeBlock(statement.body);
          if (statement.update && !this.cancelled) {
            await this.execute(statement.update);
          }
        }
        return result;
      }
      return evaluate(statement.expression, this.env, this.runtime);
    }
  }

  async function evaluate(node, env, runtime) {
    if (node.type === "literal") {
      return node.value;
    }

    if (node.type === "identifier") {
      return env.get(node.name);
    }

    if (node.type === "unary") {
      const value = await evaluate(node.argument, env, runtime);
      if (node.operator === "!") return !value;
      if (node.operator === "-") return -value;
      if (node.operator === "+") return +value;
    }

    if (node.type === "binary") {
      if (node.operator === "&&") {
        return (await evaluate(node.left, env, runtime)) && (await evaluate(node.right, env, runtime));
      }
      if (node.operator === "||") {
        return (await evaluate(node.left, env, runtime)) || (await evaluate(node.right, env, runtime));
      }
      const left = await evaluate(node.left, env, runtime);
      const right = await evaluate(node.right, env, runtime);
      return applyOperator(node.operator, left, right);
    }

    if (node.type === "call") {
      if (node.callee.type === "member") {
        const object = await evaluate(node.callee.object, env, runtime);
        const args = [];
        for (const arg of node.args) {
          args.push(await evaluate(arg, env, runtime));
        }
        return callMethod(object, node.callee.property, args);
      }
      if (node.callee.type !== "identifier") {
        throw new Error("Only beginner built-in functions can be called.");
      }
      const name = node.callee.name;
      const args = [];
      for (const arg of node.args) {
        args.push(await evaluate(arg, env, runtime));
      }
      return callBuiltin(name, args, runtime);
    }

    if (node.type === "index") {
      const object = await evaluate(node.object, env, runtime);
      const index = await evaluate(node.index, env, runtime);
      return getIndex(object, index);
    }

    if (node.type === "member") {
      const object = await evaluate(node.object, env, runtime);
      if (node.property === "length" && (Array.isArray(object) || typeof object === "string")) {
        return object.length;
      }
      throw new Error(`Property ".${node.property}" is only available on supported values.`);
    }

    if (node.type === "array") {
      const values = [];
      for (const element of node.elements) {
        values.push(await evaluate(element, env, runtime));
      }
      return values;
    }

    throw new Error(`Cannot evaluate "${node.type}".`);
  }

  function normalizeIndex(object, index) {
    if (!Array.isArray(object) && typeof object !== "string") {
      throw new Error("Only arrays and strings can use square-bracket indexes.");
    }
    const numericIndex = Number(index);
    if (!Number.isInteger(numericIndex) || numericIndex < 0) {
      throw new Error("Indexes must be whole numbers starting at 0.");
    }
    return numericIndex;
  }

  function getIndex(object, index) {
    return object[normalizeIndex(object, index)];
  }

  function setArrayIndex(object, index, value) {
    if (!Array.isArray(object)) {
      throw new Error("Only arrays can be changed with square-bracket assignment.");
    }
    object[normalizeIndex(object, index)] = value;
  }

  const stringMethods = {
    toUpperCase: (text) => text.toUpperCase(),
    toLowerCase: (text) => text.toLowerCase(),
    trim: (text) => text.trim(),
    trimStart: (text) => text.trimStart(),
    trimEnd: (text) => text.trimEnd(),
    includes: (text, search, position) => text.includes(String(search), position),
    startsWith: (text, search, position) => text.startsWith(String(search), position),
    endsWith: (text, search, length) => text.endsWith(String(search), length),
    indexOf: (text, search, position) => text.indexOf(String(search), position),
    lastIndexOf: (text, search, position) => text.lastIndexOf(String(search), position),
    slice: (text, start, end) => text.slice(start, end),
    substring: (text, start, end) => text.substring(start, end),
    replace: (text, search, replacement) => text.replace(String(search), String(replacement)),
    replaceAll: (text, search, replacement) => text.replaceAll(String(search), String(replacement)),
    repeat: (text, count) => text.repeat(count),
    charAt: (text, index) => text.charAt(index),
    at: (text, index) => text.at(index),
    concat: (text, ...parts) => text.concat(...parts.map(String)),
    padStart: (text, length, fill = " ") => text.padStart(length, String(fill)),
    padEnd: (text, length, fill = " ") => text.padEnd(length, String(fill)),
    split: (text, separator, limit) => text.split(separator === undefined ? undefined : String(separator), limit),
  };

  function callMethod(object, name, args) {
    if (typeof object === "string" && Object.prototype.hasOwnProperty.call(stringMethods, name)) {
      return stringMethods[name](object, ...args);
    }
    if (typeof object === "string") {
      throw new Error(`String method ".${name}()" is not available.`);
    }
    throw new Error(`Method ".${name}()" is only available on supported values.`);
  }

  function applyOperator(operator, left, right) {
    if (operator === "+") return left + right;
    if (operator === "-") return left - right;
    if (operator === "*") return left * right;
    if (operator === "/") return left / right;
    if (operator === "%") return left % right;
    if (operator === "<") return left < right;
    if (operator === ">") return left > right;
    if (operator === "<=") return left <= right;
    if (operator === ">=") return left >= right;
    if (operator === "==") return left === right;
    if (operator === "!=") return left !== right;
    throw new Error(`Unknown operator "${operator}".`);
  }

  function callBuiltin(name, args, runtime) {
    if (name === "print") return runtime.print(...args);
    if (name === "read") return runtime.read(args[0] ?? "", "text", args.length > 0);
    if (name === "readNumber") return runtime.read(args[0] ?? "", "number", args.length > 0);
    if (name === "readChoice") return runtime.readChoice(args[0] ?? "", args[1], args.length > 0);
    if (name === "delay") return runtime.delay(args[0] ?? 1);
    if (name === "react") return runtime.react(args[0] ?? "");
    if (name === "clear") return runtime.clear();
    if (name === "randomInt") {
      const min = Number(args[0]);
      const max = Number(args[1]);
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        throw new Error("randomInt(min, max) needs two numbers.");
      }
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    throw new Error(`Function "${name}" is not available.`);
  }

  const runtime = new ChatRuntime();
  const interpreter = new Interpreter(runtime, new Environment());
  let codeEditor = null;

  function getSourceCode() {
    return codeEditor ? codeEditor.getValue() : elements.source.value;
  }

  function runFresh() {
    runtime.cancel();
    elements.messages.innerHTML = "";
    runtime.lastUserBubble = null;
    interpreter.resetEnv();
    try {
      interpreter.load(getSourceCode());
      addMessage("system", "Program started.");
      interpreter.runAll();
    } catch (error) {
      addMessage("error", error.message);
      setStatus("Error");
    }
  }

  function stepFreshIfNeeded() {
    try {
      if (!interpreter.program.length || interpreter.position >= interpreter.program.length) {
        elements.messages.innerHTML = "";
        interpreter.resetEnv();
        interpreter.load(getSourceCode());
        addMessage("system", "Step mode started.");
      }
      interpreter.stepFromButton();
    } catch (error) {
      addMessage("error", error.message);
      setStatus("Error");
    }
  }

  async function runReplCommand(command) {
    const trimmed = command.trim();
    if (!trimmed) {
      return;
    }
    addReplEntry(`> ${trimmed}`);
    try {
      const statement = parseStatement(trimmed, 1);
      const result = await interpreter.execute(statement);
      if (statement.type === "expression" && result !== undefined) {
        addReplEntry(formatOutput(result));
      }
      updateInspector(interpreter, statement);
    } catch (error) {
      addReplEntry(error.message, true);
    }
  }

  function addMessage(kind, text) {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${kind}`;
    bubble.textContent = text;
    elements.messages.appendChild(bubble);
    elements.messages.scrollTop = elements.messages.scrollHeight;
    return bubble;
  }

  function addTypingBubble() {
    const bubble = document.createElement("div");
    bubble.className = "bubble app typing-bubble";
    bubble.setAttribute("aria-label", "Computer is typing");
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement("span");
      dot.textContent = ".";
      dot.style.animationDelay = `${index * 0.16}s`;
      bubble.appendChild(dot);
    }
    elements.messages.appendChild(bubble);
    elements.messages.scrollTop = elements.messages.scrollHeight;
    return bubble;
  }

  function getGraphemeCount(value) {
    if (window.Intl && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(value)).length;
    }
    return Array.from(value).length;
  }

  function addReplEntry(text, error = false) {
    const entry = document.createElement("div");
    entry.className = `repl-entry${error ? " error" : ""}`;
    entry.textContent = text;
    elements.replLog.appendChild(entry);
    elements.replLog.scrollTop = elements.replLog.scrollHeight;
  }

  function disableMessageBox() {
    elements.messageInput.disabled = true;
    elements.sendButton.disabled = true;
    elements.messageInput.value = "";
    elements.messageInput.placeholder = "Run a program that asks a question...";
    elements.choiceList.innerHTML = "";
    elements.messageForm.classList.remove("choice-mode");
    elements.messageForm.classList.add("is-hidden");
    elements.messageForm.classList.remove("is-visible");
  }

  function showMessageBox(placeholder) {
    elements.choiceList.innerHTML = "";
    elements.messageForm.classList.remove("choice-mode");
    elements.messageInput.disabled = false;
    elements.sendButton.disabled = false;
    elements.messageInput.placeholder = placeholder;
    elements.messageForm.classList.remove("is-hidden");
    elements.messageForm.classList.add("is-visible");
    window.requestAnimationFrame(() => elements.messageInput.focus());
  }

  function showChoiceBox(options, onChoose) {
    elements.messageInput.disabled = true;
    elements.sendButton.disabled = true;
    elements.messageInput.value = "";
    elements.choiceList.innerHTML = "";

    for (const option of options) {
      const button = document.createElement("button");
      button.className = "choice-button";
      button.type = "button";
      button.textContent = String(option);
      button.title = String(option);
      button.addEventListener("click", () => onChoose(option), { once: true });
      elements.choiceList.appendChild(button);
    }

    elements.messageForm.classList.add("choice-mode");
    elements.messageForm.classList.remove("is-hidden");
    elements.messageForm.classList.add("is-visible");
    window.requestAnimationFrame(() => elements.choiceList.querySelector("button")?.focus());
  }

  function setStatus(status) {
    elements.status.textContent = status;
    updateExecutionState(status);
  }

  function updateInspector(activeInterpreter, statement = null) {
    const snapshot = activeInterpreter.env.snapshot();
    elements.variables.innerHTML = "";

    const names = Object.keys(snapshot);
    if (!names.length) {
      const empty = document.createElement("div");
      empty.className = "state-pill";
      empty.textContent = "No variables yet.";
      elements.variables.appendChild(empty);
    }

    for (const name of names) {
      const row = document.createElement("div");
      row.className = "variable-row";
      const key = document.createElement("dt");
      const value = document.createElement("dd");
      key.textContent = name;
      value.textContent = formatOutput(snapshot[name]);
      row.append(key, value);
      elements.variables.appendChild(row);
    }

    const status = elements.status.textContent || "Ready";
    updateExecutionState(status, activeInterpreter, statement);
  }

  function updateExecutionState(status, activeInterpreter = interpreter, statement = null) {
    const total = activeInterpreter.program.length;
    const current = Math.min(activeInterpreter.position, total);
    const lastLine = statement ? statement.source : "None";
    elements.executionState.innerHTML = "";
    for (const text of [
      `Status: ${status}`,
      `Statement: ${current} of ${total}`,
      `Last line: ${lastLine}`,
      `Last result: ${formatOutput(activeInterpreter.lastResult)}`,
    ]) {
      const row = document.createElement("div");
      row.className = "state-pill";
      row.textContent = text;
      elements.executionState.appendChild(row);
    }
  }

  function formatOutput(value) {
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean" || value === null) return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function setupPaneToggles() {
    const toggles = [
      ["hide-left", elements.toggleLeft],
      ["hide-middle", elements.toggleMiddle],
      ["hide-right", elements.toggleRight],
    ];
    for (const [className, button] of toggles) {
      button.addEventListener("click", () => {
        elements.workspace.classList.toggle(className);
        button.setAttribute("aria-pressed", String(!elements.workspace.classList.contains(className)));
      });
    }
  }

  function setupResizers() {
    const leftResizer = document.querySelector('[data-resizer="left"]');
    const rightResizer = document.querySelector('[data-resizer="right"]');
    let drag = null;

    leftResizer.addEventListener("pointerdown", (event) => {
      drag = { side: "left", startX: event.clientX, start: getColumns() };
      leftResizer.setPointerCapture(event.pointerId);
    });

    rightResizer.addEventListener("pointerdown", (event) => {
      drag = { side: "right", startX: event.clientX, start: getColumns() };
      rightResizer.setPointerCapture(event.pointerId);
    });

    window.addEventListener("pointermove", (event) => {
      if (!drag || window.innerWidth <= 900) {
        return;
      }
      const delta = event.clientX - drag.startX;
      const columns = { ...drag.start };
      if (drag.side === "left") {
        columns.left = clamp(columns.left + delta, 260, window.innerWidth - columns.right - 430);
      } else {
        columns.right = clamp(columns.right - delta, 220, window.innerWidth - columns.left - 430);
      }
      setColumns(columns);
    });

    window.addEventListener("pointerup", () => {
      drag = null;
    });
  }

  function getColumns() {
    const rects = {
      left: document.querySelector('[data-pane="left"]').getBoundingClientRect().width,
      right: document.querySelector('[data-pane="right"]').getBoundingClientRect().width,
    };
    return rects;
  }

  function setColumns(columns) {
    elements.workspace.style.gridTemplateColumns = `${columns.left}px 7px minmax(320px, 1fr) 7px ${columns.right}px`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  elements.source.value = starterCode;
  codeEditor = CodeMirror.fromTextArea(elements.source, {
    mode: "javascript",
    theme: "material-darker",
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
    autofocus: true,
    extraKeys: {
      "Ctrl-Enter": runFresh,
      "Cmd-Enter": runFresh,
    },
  });
  elements.runButton.addEventListener("click", runFresh);
  elements.stepButton.addEventListener("click", stepFreshIfNeeded);
  elements.stopButton.addEventListener("click", () => interpreter.stop());
  elements.resetButton.addEventListener("click", () => {
    runtime.cancel();
    elements.messages.innerHTML = "";
    runtime.lastUserBubble = null;
    interpreter.resetEnv();
    interpreter.program = [];
    disableMessageBox();
    setStatus("Ready");
    addMessage("system", "Workspace reset.");
  });

  elements.messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = elements.messageInput.value;
    if (!value.trim() || !runtime.pendingRead) {
      return;
    }
    runtime.receive(value);
  });

  elements.replForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const command = elements.replCommand.value;
    elements.replCommand.value = "";
    runReplCommand(command);
  });

  elements.replCommand.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    const command = elements.replCommand.value;
    elements.replCommand.value = "";
    runReplCommand(command);
  });

  setupPaneToggles();
  setupResizers();
  disableMessageBox();
  updateInspector(interpreter);
  addMessage("system", "Ready to run.");
})();
