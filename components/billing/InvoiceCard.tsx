import { FileText, Download } from "lucide-react";
import { formatDateTime } from "@/lib/schedule/timezone";
import { formatINR, planLimits } from "@/lib/billing/plans";
import type { Invoice } from "@/types/billing";

const STATUS_COLOR: Record<Invoice["status"], string> = { paid: "text-aurora-green", open: "text-amber-300", void: "text-white/35" };

export default function InvoiceCard({ invoice }: { invoice: Invoice }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
        <FileText size={15} className="text-white/45" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white/85">{invoice.invoice_number}</p>
        <p className="text-[11px] text-white/35">
          {planLimits(invoice.plan).name} · {formatDateTime(invoice.created_at)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[13px] font-semibold text-white">{formatINR(invoice.amount)}</p>
        <p className={`text-[10px] uppercase tracking-wide ${STATUS_COLOR[invoice.status]}`}>{invoice.status}</p>
      </div>
      {invoice.invoice_url ? (
        <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer" aria-label="Download invoice" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white">
          <Download size={14} />
        </a>
      ) : (
        <span className="w-8 shrink-0" />
      )}
    </div>
  );
}
