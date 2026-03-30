import { Link, useLocation } from "wouter";
import { BarChart2, Settings, FileText, Zap } from "lucide-react";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const [loc] = useLocation();

  const navItem = (href: string, Icon: typeof Zap, label: string) => (
    <Link href={href}>
      <a
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          loc === href
            ? "bg-indigo-600 text-white"
            : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
        }`}
      >
        <Icon size={16} />
        {label}
      </a>
    </Link>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Sidebar */}
      <aside className="w-48 flex-shrink-0 border-r border-slate-700 flex flex-col p-4 gap-1">
        <div className="flex items-center gap-2 mb-6 px-1">
          <Zap size={20} className="text-indigo-400" />
          <span className="font-bold text-slate-100 text-sm">Vibe Staking</span>
        </div>
        {navItem("/", BarChart2, "Dashboard")}
        {navItem("/audit", FileText, "Audit Log")}
        {navItem("/settings", Settings, "Settings")}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
