import { useRef, useState } from "react";
import { motion } from "framer-motion";
import html2pdf from "html2pdf.js";
import {
  Check,
  Copy,
  Download,
  FileText,
  Hash,
  Loader2,
  Clock3,
  PencilLine,
  Sparkles,
} from "lucide-react";
import { Markdown } from "./Markdown";
import { readingMinutes, wordCount } from "@/lib/utils";

interface ResultPanelProps {
  markdown: string;
  threadId: string;
  isDraft: boolean;
  onError: (message: string) => void;
}

export function ResultPanel({
  markdown,
  threadId,
  isDraft,
  onError,
}: ResultPanelProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      onError("Could not copy to the clipboard.");
    }
  }

  async function handleDownload() {
    if (!markdown || !printRef.current) {
      onError("There is no travel plan to download yet.");
      return;
    }
    setExporting(true);
    // Force a light palette for the snapshot so the exported PDF is readable
    // on white paper regardless of the theme on screen.
    printRef.current.classList.add("pdf-light");
    try {
      const source = printRef.current.cloneNode(true) as HTMLDivElement;
      source.classList.add("pdf-export");
      // Keep headings with a short paragraph or small table, without keeping
      // whole sections or large tables together and leaving holes on the page.
      source.querySelectorAll("h1, h2, h3, h4").forEach((heading) => {
        const next = heading.nextElementSibling;
        const shortParagraph = next?.tagName === "P";
        const smallTable = next?.matches(".table-scroll") && next.querySelectorAll("tr").length <= 4;
        if (next && (shortParagraph || smallTable) && (next.textContent?.length ?? 0) <= 600) {
          const group = document.createElement("div");
          group.className = "pdf-heading-group";
          heading.before(group);
          group.append(heading, next);
        }
      });
      source.querySelectorAll("tr").forEach((row) => {
        if ((row.textContent?.length ?? 0) <= 600) row.classList.add("pdf-short-row");
      });
      // Give the existing paginator small, safe boundaries in long plain-text
      // cells. Preserve rich cells and every original character; this clone is
      // used only for export, never for screen rendering or clipboard content.
      source.querySelectorAll("td").forEach((cell) => {
        const text = cell.textContent ?? "";
        if (cell.children.length || text.length <= 600) return;
        const words = text.match(/\S+\s*|\s+/g) ?? [];
        let part = "";
        const appendPart = () => {
          const block = document.createElement("div");
          block.className = "pdf-cell-part";
          block.textContent = part;
          cell.append(block);
        };
        cell.textContent = "";
        words.forEach((word) => {
          if (part && part.length + word.length > 180) {
            appendPart();
            part = "";
          }
          part += word;
        });
        if (part) appendPart();
      });
      const worker = html2pdf();
      type PdfExportOptions = Parameters<typeof worker.set>[0] & {
        pagebreak?: {
          mode?: "avoid-all" | "css" | "legacy" | ("avoid-all" | "css" | "legacy")[];
          before?: string | string[];
          after?: string | string[];
          avoid?: string | string[];
        };
      };
      const options: PdfExportOptions = {
        margin: 0.5,
        filename: isDraft
          ? "tripweave-draft-plan.pdf"
          : "tripweave-travel-plan.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".pdf-short-row", ".pdf-cell-part", ".pdf-heading-group", "p"],
        },
      };
      await worker
        .set(options)
        .from(source)
        .save();
    } catch {
      onError("Could not generate the PDF.");
    } finally {
      printRef.current?.classList.remove("pdf-light");
      setExporting(false);
    }
  }

  return (
    <motion.section
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="glass overflow-hidden rounded-4xl"
    >
      {/* Header */}
      <div
        className="flex flex-wrap items-start justify-between gap-4 border-b px-6 py-5 sm:px-8"
        style={{ borderColor: "rgb(var(--border) / var(--border-alpha))" }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: isDraft
                  ? "rgb(var(--warn) / 0.14)"
                  : "rgb(var(--ok) / 0.14)",
                border: `1px solid rgb(var(--${isDraft ? "warn" : "ok"}) / 0.3)`,
                color: `rgb(var(--${isDraft ? "warn" : "ok"}))`,
              }}
            >
              {isDraft ? (
                <>
                  <PencilLine className="h-3 w-3" /> Draft
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" /> Final
                </>
              )}
            </span>
          </div>

          <h2 className="mt-2 text-xl font-bold tracking-tight text-hi">
            {isDraft ? "Draft travel plan" : "Your AI travel plan"}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-low">
            <span className="flex items-center gap-1.5 font-mono">
              <Hash className="h-3 w-3" />
              {threadId ? `${threadId.slice(0, 8)}…${threadId.slice(-4)}` : "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              {wordCount(markdown).toLocaleString()} words
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-3 w-3" />
              {readingMinutes(markdown)} min read
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleCopy} className="btn btn-ghost px-4 py-2.5 text-xs">
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" style={{ color: "rgb(var(--ok))" }} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={exporting}
            className="btn btn-primary sheen px-4 py-2.5 text-xs"
          >
            {exporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Preparing…
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-7 sm:px-8">
        <div ref={printRef} className="pdf-root">
          <h1 className="mb-5 hidden text-2xl font-bold print:block">
            TripWeave Travel Plan
          </h1>
          <Markdown>{markdown}</Markdown>
        </div>
      </div>
    </motion.section>
  );
}
