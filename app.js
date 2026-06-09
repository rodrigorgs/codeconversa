(function () {
  const starterCode = `let name = read("What's your name?")
print("Hi", name)
let age = readNumber("How old are you?")
print("You are", age, "years old")`;

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
      if (["==", "!=", "<=", ">=", "&&", "||"].includes(pair)) {
        tokens.push({ type: "operator", value: pair });
        index += 2;
        continue;
      }

      if ("+-*/%<>=!,()".includes(char)) {
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

    if (token.type === "number" || token.type === "string") {
      return { type: "literal", value: token.value };
    }

    if (token.type === "identifier") {
      if (token.value === "true" || token.value === "false") {
        return { type: "literal", value: token.value === "true" };
      }
      if (token.value === "null") {
        return { type: "literal", value: null };
      }
      let expression = { type: "identifier", name: token.value };
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
      return expression;
    }

    if (token.value === "(") {
      const expression = parseBinary(stream, 0);
      stream.expect(")");
      return expression;
    }

    throw new Error(`Unexpected "${token.value || "end of expression"}".`);
  }

  function splitStatements(source) {
    const statements = [];
    let current = "";
    let quote = null;
    let escaped = false;

    for (const char of source) {
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

      if (char === "\n" || char === ";") {
        pushStatement(statements, current);
        current = "";
        continue;
      }

      current += char;
    }

    if (quote) {
      throw new Error("Unclosed string.");
    }

    pushStatement(statements, current);
    return statements;
  }

  function pushStatement(statements, raw) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) {
      return;
    }
    statements.push(parseStatement(line, statements.length + 1));
  }

  function parseStatement(line, lineNumber) {
    const declaration = line.match(/^(let|const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(.+)$/);
    if (declaration) {
      const [, kind, name, expression] = declaration;
      if (forbiddenWords.has(name)) {
        throw new Error(`"${name}" cannot be used as a variable name.`);
      }
      return { type: "declaration", kind, name, expression: parseExpression(expression), source: line, lineNumber };
    }

    const assignment = line.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(.+)$/);
    if (assignment) {
      const [, name, expression] = assignment;
      return { type: "assignment", name, expression: parseExpression(expression), source: line, lineNumber };
    }

    return { type: "expression", expression: parseExpression(line), source: line, lineNumber };
  }

  function parseProgram(source) {
    for (const word of forbiddenWords) {
      const pattern = new RegExp(`\\b${word}\\b`);
      if (pattern.test(source)) {
        throw new Error(`"${word}" is not available here. Programs in this lab use simple, synchronous-looking code.`);
      }
    }
    return splitStatements(source);
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
    }

    print(...values) {
      addMessage("app", values.map(formatOutput).join(" "));
      return undefined;
    }

    clear() {
      elements.messages.innerHTML = "";
      return undefined;
    }

    read(question, mode) {
      if (this.pendingRead) {
        throw new Error("The program is already waiting for an answer.");
      }

      addMessage("app", String(question ?? ""));
      setStatus(mode === "number" ? "Waiting for a number" : "Waiting for an answer");
      elements.messageInput.disabled = false;
      elements.sendButton.disabled = false;
      elements.messageInput.placeholder = mode === "number" ? "Type a number..." : "Type your answer...";
      elements.messageInput.focus();

      return new Promise((resolve, reject) => {
        this.pendingRead = { mode, resolve, reject };
      });
    }

    receive(raw) {
      if (!this.pendingRead) {
        return;
      }
      const pending = this.pendingRead;
      const trimmed = raw.trim();
      addMessage("user", raw);

      if (pending.mode === "number") {
        const value = Number(trimmed.replace(",", "."));
        if (!trimmed || Number.isNaN(value)) {
          addMessage("error", "Please type a valid number.");
          elements.messageInput.focus();
          return;
        }
        this.pendingRead = null;
        disableMessageBox();
        pending.resolve(value);
        return;
      }

      this.pendingRead = null;
      disableMessageBox();
      pending.resolve(raw);
    }

    cancel() {
      if (!this.pendingRead) {
        return;
      }
      const pending = this.pendingRead;
      this.pendingRead = null;
      disableMessageBox();
      pending.reject(new Error("Program stopped."));
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
          setStatus("Done");
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
          setStatus(this.position >= this.program.length ? "Done" : "Ready");
        } else {
          setStatus("Done");
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

    throw new Error(`Cannot evaluate "${node.type}".`);
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
    if (name === "read") return runtime.read(args[0] ?? "", "text");
    if (name === "readNumber") return runtime.read(args[0] ?? "", "number");
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

  function runFresh() {
    runtime.cancel();
    elements.messages.innerHTML = "";
    interpreter.resetEnv();
    try {
      interpreter.load(elements.source.value);
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
        interpreter.load(elements.source.value);
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
  elements.runButton.addEventListener("click", runFresh);
  elements.stepButton.addEventListener("click", stepFreshIfNeeded);
  elements.stopButton.addEventListener("click", () => interpreter.stop());
  elements.resetButton.addEventListener("click", () => {
    runtime.cancel();
    elements.messages.innerHTML = "";
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
