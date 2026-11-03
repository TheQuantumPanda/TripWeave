import { Loader2 } from "lucide-react";

const STEPS = ["Check your request", "Choose the specialists", "Research the details", "Draft your itinerary"];

/** The API is not streaming. These are workflow stages, never measured progress. */
export function PlanSkeleton() {
  return (
    <section className="glass rounded-4xl px-6 py-7 sm:px-8" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3"><Loader2 className="h-4 w-4 animate-spin text-accent" /><h2 className="font-semibold">Building your plan</h2></div>
      <p className="mt-2 text-sm text-mid">Gathering the details for your next adventure. This may take a little while.</p>
      <p className="mt-5 label-eyebrow">What goes into a plan</p>
      <ol className="loading-stages mt-3">
        {STEPS.map((label, index) => <li key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}
      </ol>
      <div className="skeleton mt-6 h-1.5 w-full" />
      <p className="mt-3 text-xs text-low">Waiting for the server. Individual stage progress is not available.</p>
    </section>
  );
}
