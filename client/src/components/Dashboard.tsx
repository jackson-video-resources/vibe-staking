import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePortfolio } from "../hooks/use-portfolio.js";
import { useConfig } from "../hooks/use-config.js";
import { api } from "../lib/api.js";
import { Link } from "wouter";

interface AuditEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  summary: string;
  details: Record<string, unknown> | null;
  claudeTokensUsed: number | null;
}

const AGENT_LABEL: Record<string, string> = {
  "yield-scout": "Scout",
  "risk-model": "Risk",
  "portfolio-manager": "Manager",
  executor: "Executor",
  "balance-detector": "Balance",
};

const AGENT_COLOR: Record<string, string> = {
  "yield-scout": "#6366f1",
  "risk-model": "#eab308",
  "portfolio-manager": "#22c55e",
  executor: "#f97316",
  "balance-detector": "#38bdf8",
};

export default function Dashboard() {
  const { data: portfolio } = usePortfolio();
  const { data: config } = useConfig();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: auditEntries } = useQuery({
    queryKey: ["audit"],
    queryFn: () => api.get<AuditEntry[]>("/audit?limit=50"),
    refetchInterval: 15_000,
  });

  const positions = portfolio?.positions ?? [];
  const totalValue = portfolio?.totalValueUsd ?? 0;
  const apy = portfolio?.netApyCurrent ?? 0;
  const yieldEarned = portfolio?.totalYieldEarnedUsd ?? 0;
  const gasSpent = portfolio?.totalGasSpentUsd ?? 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #e5e7eb",
          background: "#fff",
          padding: "0 24px",
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "#111",
          }}
        >
          VIBE STAKING
        </span>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          {config?.isPaused && (
            <span
              style={{
                fontSize: "11px",
                color: "#dc2626",
                fontWeight: 600,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "2px 8px",
                borderRadius: "4px",
              }}
            >
              PAUSED
            </span>
          )}
          <Link href="/settings">
            <a
              style={{
                fontSize: "13px",
                color: "#6b7280",
                textDecoration: "none",
              }}
            >
              Settings
            </a>
          </Link>
        </div>
      </div>

      <div
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}
      >
        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <StatCard
            label="Total Value"
            value={`$${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          />
          <StatCard label="Net APY" value={`${apy.toFixed(2)}%`} highlight />
          <StatCard label="Yield Earned" value={`$${yieldEarned.toFixed(2)}`} />
          <StatCard label="Gas Spent" value={`$${gasSpent.toFixed(2)}`} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          {/* Positions */}
          <div>
            <h2
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Active Positions ({positions.length})
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {positions.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontSize: "13px",
                    color: "#9ca3af",
                  }}
                >
                  No positions yet — send funds to get started
                </div>
              ) : (
                positions.map((pos) => (
                  <div
                    key={pos.id}
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#111",
                            marginBottom: "2px",
                          }}
                        >
                          {pos.protocol}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>
                          {pos.chain} · {pos.symbol}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#111",
                          }}
                        >
                          $
                          {pos.amountUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#16a34a",
                            fontWeight: 600,
                          }}
                        >
                          {(pos.currentApy ?? pos.entryApy).toFixed(2)}% APY
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div>
            <h2
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#374151",
                marginBottom: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Agent Activity
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1px",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {!auditEntries || auditEntries.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    fontSize: "13px",
                    color: "#9ca3af",
                  }}
                >
                  Waiting for agent activity...
                </div>
              ) : (
                auditEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "11px 14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: AGENT_COLOR[entry.agent] ?? "#6b7280",
                          background: `${AGENT_COLOR[entry.agent] ?? "#6b7280"}18`,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          flexShrink: 0,
                          marginTop: "1px",
                        }}
                      >
                        {AGENT_LABEL[entry.agent] ?? entry.agent}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#111",
                            lineHeight: "1.4",
                          }}
                        >
                          {entry.summary}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                            marginTop: "2px",
                          }}
                        >
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {entry.claudeTokensUsed
                            ? ` · ${entry.claudeTokensUsed.toLocaleString()} tokens`
                            : ""}
                        </div>
                      </div>
                    </button>
                    {expandedId === entry.id && entry.details && (
                      <div style={{ padding: "0 14px 12px 14px" }}>
                        <pre
                          style={{
                            fontSize: "11px",
                            color: "#374151",
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            padding: "10px 12px",
                            borderRadius: "6px",
                            overflow: "auto",
                            maxHeight: "160px",
                            margin: 0,
                          }}
                        >
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: highlight ? "#16a34a" : "#111",
        }}
      >
        {value}
      </div>
    </div>
  );
}
