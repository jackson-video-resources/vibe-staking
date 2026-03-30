import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-white">{children}</div>
  );
}
