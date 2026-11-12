/**
 * Minimal, dependency-free Markdown → TipTap JSON converter.
 *
 * Deliberately narrow: supports the formatting we expose in the editor
 * (headings, bold, italic, bulleted/numbered lists, paragraphs).
 * Edge cases (nested lists, links, images, code blocks) fall through
 * as paragraphs — stated in the README.
 */

type Node = { type: string; attrs?: Record<string, unknown>; content?: Node[]; text?: string; marks?: { type: string }[] };

function inlineToNodes(line: string): Node[] {
  // Handle **bold** and *italic* / _italic_ in a simple left-to-right scan.
  const out: Node[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(line)) !== null) {
    if (m.index > lastIdx) {
      out.push({ type: "text", text: line.slice(lastIdx, m.index) });
    }
    const token = m[0];
    if (token.startsWith("**")) {
      out.push({
        type: "text",
        text: token.slice(2, -2),
        marks: [{ type: "bold" }],
      });
    } else {
      out.push({
        type: "text",
        text: token.slice(1, -1),
        marks: [{ type: "italic" }],
      });
    }
    lastIdx = m.index + token.length;
  }
  if (lastIdx < line.length) {
    out.push({ type: "text", text: line.slice(lastIdx) });
  }
  return out.length > 0 ? out : [];
}

export function markdownToTiptap(md: string): object {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const content: Node[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      const level = h[1].length;
      content.push({
        type: "heading",
        attrs: { level },
        content: inlineToNodes(h[2]),
      });
      i++;
      continue;
    }

    // Bulleted list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: Node[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, "");
        items.push({
          type: "listItem",
          content: [
            { type: "paragraph", content: inlineToNodes(itemText) },
          ],
        });
        i++;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: Node[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
        items.push({
          type: "listItem",
          content: [
            { type: "paragraph", content: inlineToNodes(itemText) },
          ],
        });
        i++;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }

    // Paragraph (may span multiple non-empty lines)
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3}\s|[-*]\s|\d+\.\s)/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    content.push({
      type: "paragraph",
      content: inlineToNodes(paraLines.join(" ")),
    });
  }

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

/** Turn a plain-text file into a minimal TipTap doc (one paragraph per line). */
export function textToTiptap(txt: string): object {
  const paragraphs = txt
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const content =
    paragraphs.length > 0
      ? paragraphs.map((p) => ({
          type: "paragraph",
          content: [{ type: "text", text: p }],
        }))
      : [{ type: "paragraph" }];

  return { type: "doc", content };
}
