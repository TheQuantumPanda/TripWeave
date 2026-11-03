import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, MessagesSquare, RefreshCw, UserCheck } from "lucide-react";

const FEEDBACK_PRESETS = [
  "Reduce the hotel cost and add one free day.",
  "Make the itinerary less packed — two activities per day max.",
  "Swap in more local food experiences.",
  "Add airport transfer details and a packing list.",
];

interface ApprovalPanelProps {
  request: string;
  pending: "none" | "plan" | "approve" | "revise";
  onDecide: (approved: boolean, feedback: string) => void;
}

export function ApprovalPanel({ request, pending, onDecide }: ApprovalPanelProps) {
  const [feedback, setFeedback] = useState("");
  const busy = pending === "approve" || pending === "revise";

  return (
    <motion.section
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      className="approval-panel relative overflow-hidden rounded-4xl"
      style={{
        background: "rgb(var(--surface) / var(--surface-strong-alpha))",
        border: "1px solid rgb(var(--border) / var(--border-alpha))",
        
        
      }}
    >
      <div className="relative px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {/* Icon */}
          <span className="relative grid h-12 w-12 flex-none place-items-center rounded-2xl"
            style={{
              background: "rgb(var(--warn) / 0.14)",
              border: "1px solid rgb(var(--warn) / 0.32)",
            }}
          >
            <UserCheck className="h-5 w-5" style={{ color: "rgb(var(--warn))" }} />
            <span
              aria-hidden
              className="hidden"
              style={{ border: "1px solid rgb(var(--warn) / 0.5)" }}
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="label-eyebrow" style={{ color: "rgb(var(--warn))" }}>
              Your trip, your call
            </p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-hi">
              Review the draft itinerary
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mid">
              {request ||
                "Approve to polish and finalize the draft, or revise and finalize it using your feedback."}
            </p>

            {/* Feedback composer */}
            <div className="mt-5">
              <label
                htmlFor="approval-feedback"
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-mid"
              >
                <MessagesSquare className="h-3.5 w-3.5" />
                Revision feedback
                <span className="font-normal text-low">(required to revise)</span>
              </label>

              <textarea
                id="approval-feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={busy}
                rows={3}
                placeholder="For example: reduce the hotel cost and add one free day…"
                className="w-full resize-none rounded-2xl px-4 py-3 text-sm leading-relaxed outline-none transition-colors disabled:opacity-60"
                style={{
                  background: "rgb(var(--bg-raise))",
                  border: "1px solid rgb(var(--control-border))",
                }}
              />

              <p className="mt-2 text-sm leading-relaxed text-mid">
                Your feedback will be applied to the itinerary, and the revised version will become your final plan.
              </p>

              <div className="mt-2.5 flex flex-wrap gap-2">
                {FEEDBACK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={busy}
                    onClick={() => setFeedback(preset)}
                    className="chip text-[11px] disabled:opacity-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <button
                onClick={() => onDecide(true, "")}
                disabled={busy}
                className="btn btn-success sheen flex-1 sm:flex-none"
              >
                {pending === "approve" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Finalising plan…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Approve &amp; generate final
                  </>
                )}
              </button>

              <button
                onClick={() => onDecide(false, feedback)}
                disabled={busy || !feedback.trim()}
                className="btn btn-ghost flex-1 sm:flex-none"
              >
                {pending === "revise" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Revising…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Revise &amp; Finalize
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
