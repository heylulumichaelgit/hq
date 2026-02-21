"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pt-[60px] md:pt-0">
        <div className="mx-auto max-w-4xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
