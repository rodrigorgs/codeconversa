(function () {
  const docs = {
    canvas: "tutorials/canvas.md",
    programacao: "tutorials/programacao.md",
  };

  const params = new URLSearchParams(window.location.search);
  const doc = params.get("doc") || "programacao";
  const path = docs[doc] || docs.programacao;
  const content = document.getElementById("tutorial-content");

  fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Tutorial não encontrado.");
      }
      return response.text();
    })
    .then((markdown) => {
      content.innerHTML = renderMarkdown(markdown);
      const heading = content.querySelector("h1");
      if (heading) {
        document.title = `${heading.textContent} - CodeConversa`;
      }
    })
    .catch((error) => {
      content.innerHTML = `<h1>Não foi possível carregar</h1><p>${escapeHtml(error.message)}</p>`;
    });

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let list = [];
    let code = [];
    let inCode = false;

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }

    function flushList() {
      if (!list.length) return;
      html.push(`<ul>${list.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      list = [];
    }

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (inCode) {
          html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
          code = [];
          inCode = false;
        } else {
          flushParagraph();
          flushList();
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        code.push(line);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = heading[1].length;
        html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        continue;
      }

      const item = line.match(/^-\s+(.+)$/);
      if (item) {
        flushParagraph();
        list.push(item[1]);
        continue;
      }

      paragraph.push(line.trim());
    }

    flushParagraph();
    flushList();
    return html.join("\n");
  }

  function renderInline(text) {
    return escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
