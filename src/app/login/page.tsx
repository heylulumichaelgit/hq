import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* ── Left branding panel ── */}
      <div className="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden bg-muted p-12">
        {/* Subtle ambient circles */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/6 blur-2xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            M
          </div>
          <span className="font-semibold text-lg tracking-tight">HQ</span>
        </div>

        {/* Tagline */}
        <div className="relative space-y-5">
          <h1 className="font-serif text-5xl font-bold leading-[1.15] tracking-tight text-foreground">
            Your family,<br />organized.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-sm">
            Todos, shared calendar, grocery lists and bookings — one calm place for everyone.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {["✓ Shared todos", "✓ Family calendar", "✓ Grocery list", "✓ Bookings"].map((f) => (
              <span
                key={f}
                className="rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-muted-foreground/50">
          Michael Family HQ
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-background p-8 md:p-16">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-3 md:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            M
          </div>
          <span className="font-semibold text-lg tracking-tight">HQ</span>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
