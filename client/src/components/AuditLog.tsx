import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";
import { ChevronDown, ChevronRight } from "lucide-react";

interface AuditEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  summary: string;
  details: Record<string, unknown> | null;
  claudeTokensUsed: number | null;
}

const AGENT_COLORS: Record<string, string> = {
  "yield-scout": "text-indigo-400",
  "risk-model": "text-yellow-400",
  "portfolio-manager": "text-green-400",
  executor: "text-red-400",
  "balance-detector": "text-sky-400",
};

function Row({ entry }: { entry: AuditEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-800">
      <button
        className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-start gap-3"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mt-0.5 text-slate-600 flex-shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-xs font-medium ${AGENT_COLORS[entry.agent] ?? "text-slate-400"}`}
            >
              {entry.agent}
            </span>
            <span className="text-xs text-slate-500">{entry.action}</span>
            {entry.claudeTokensUsed && (
              <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 rounded">
                {entry.claudeTokensUsed.toLocaleString()} tokens
              </span>
            )}
          </div>
          <div className="text-xs text-slate-300 truncate">{entry.summary}</div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            {new Date(entry.timestamp).toLocaleString()}
          </div>
        </div>
      </button>
      {open && entry.details && (
        <div className="px-8 pb-3">
          <pre className="text-[10px] text-slate-400 bg-slate-900 p-3 rounded overflow-auto max-h-48">
            {JSON.stringify(entry.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AuditLog() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get<AuditEntry[]>("/audit?limit=100"),
    refetchInterval: 15_000,
  });

  return (
    <div className="p-6">
      <h1 className="text-lg font-bold text-slate-100 mb-4">Audit Log</h1>
      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        {isLoading && (
          <div className="p-8 text-center text-slate-500 text-sm">
            Loading...
          </div>
        )}
        {entries?.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            No events yet. The agent will log all decisions here.
          </div>
        )}
        {entries?.map((entry) => (
          <Row key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
