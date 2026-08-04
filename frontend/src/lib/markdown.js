function escape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderMarkdown(md) {
  if (!md) return "";

  let s = escape(md);

  // Code blocks ```...```
  s = s.replace(/```([\s\S]*?)```/g, (_, c) =>
    `<pre><code>${c.trim()}</code></pre>`
  );

  // Inline code
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Links [text](url)
  s = s.replace(
    /\[([^\]]+)\]\((https?:[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Lists
  const lines = s.split("\n");
  const out = [];

  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    const ulMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    const olMatch = /^\s*\d+\.\s+(.*)$/.exec(line);

    if (ulMatch) {
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      out.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      out.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }

      if (line.trim() === "") {
        out.push("");
      } else {
        out.push(`<p>${line}</p>`);
      }
    }
  }

  if (inUl) out.push("</ul>");
  if (inOl) out.push("</ol>");

  return out.join("\n");
}