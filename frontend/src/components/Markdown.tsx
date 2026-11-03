import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Root, Element } from "hast";

// Interpret only bare break tags in cells; all other generated HTML stays escaped.
function tableCellBreaks() {
  return (tree: Root) => {
    function visit(parent: Root | Element, inCell = false) {
      parent.children.forEach((node, index) => {
        if (node.type === "raw" && inCell && /^<br\s*\/?\s*>$/i.test(node.value)) {
          parent.children[index] = { type: "element", tagName: "br", properties: {}, children: [] };
        } else if (node.type === "element" && node.tagName !== "code" && node.tagName !== "pre") {
          visit(node, inCell || node.tagName === "td" || node.tagName === "th");
        }
      });
    }
    visit(tree);
  };
}

/**
 * Styling lives in the `.md` block in index.css so the same rules apply to
 * the on-screen view and the html2pdf snapshot.
 */
function MarkdownBase({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[tableCellBreaks]}
        components={{
          table: ({ node: _node, ...props }) => (
            <div className="table-scroll">
              <table {...props} />
            </div>
          ),
          a: ({ node: _node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer noopener" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownBase);
