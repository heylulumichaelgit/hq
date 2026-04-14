"use client";

import { useState, useEffect } from "react";
import { LoginForm } from "@/features/auth/login-form";

const QUOTES = [
  { text: "The best family systems disappear into the background.", author: null },
  { text: "Calm is a product feature.", author: null },
  { text: "A good home rhythm beats heroic catch-up.", author: null },
  { text: "Less chaos. More life.", author: null },
  { text: "What matters today should be obvious in seconds.", author: null },
];

export default function LoginPage() {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden bg-muted p-12">
        {/* Ambient blur */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/6 blur-2xl" />

        {/* Top logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            M
          </div>
          <span className="font-semibold text-lg tracking-tight">HQ</span>
        </div>

        {/* Center — large monogram + quote */}
        <div className="relative flex flex-col items-start gap-8">
          <span className="font-serif text-[11rem] font-bold leading-none text-foreground/8 select-none">
            M
          </span>
          <blockquote className="space-y-2 -mt-6">
            <p className="font-serif text-2xl font-medium leading-snug text-foreground/80 max-w-xs">
              "{quote.text}"
            </p>
          </blockquote>
        </div>

        {/* Bottom */}
        <p className="relative text-xs text-muted-foreground/40 tracking-wide">
          Family operating system
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-background p-8 md:p-16">
        {/* Mobile: icon only, centered */}
        <div className="mb-8 flex justify-center md:hidden">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            M
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
