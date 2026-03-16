"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  House,
  Star,
  Inbox,
  CheckSquare,
  Calendar,
  BarChart2,
  Plus,
  CalendarPlus,
  Search,
  ChevronRight,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandStore } from "@/lib/command-store";
import { useTodos } from "@/features/todos/queries";
import { useProjects } from "@/features/projects/queries";

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, setTodoFormOpen, setEventFormOpen } =
    useCommandStore();
  const { data: todos = [] } = useTodos();
  const { data: projects = [] } = useProjects();

  // Register global shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      // ⌘T / Ctrl+T — new task (only when palette not already open)
      if (mod && e.key === "t" && !paletteOpen) {
        e.preventDefault();
        setTodoFormOpen(true);
      }
      // ⌘E / Ctrl+E — new event
      if (mod && e.key === "e" && !paletteOpen) {
        e.preventDefault();
        setEventFormOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setPaletteOpen, setTodoFormOpen, setEventFormOpen, paletteOpen]);

  const run = useCallback(
    (fn: () => void) => {
      setPaletteOpen(false);
      // Slight delay so the dialog closes before the next one opens
      setTimeout(fn, 50);
    },
    [setPaletteOpen]
  );

  const navigate = useCallback(
    (href: string) => {
      setPaletteOpen(false);
      router.push(href);
    },
    [setPaletteOpen, router]
  );

  const topTodos = todos
    .filter((t) => !t.is_completed && !t.parent_id)
    .slice(0, 8);

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} showCloseButton={false}>
      <CommandInput placeholder="Search or jump to..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <Search className="size-8 mx-auto mb-2 text-muted-foreground/40" />
          No results found.
        </CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Create">
          <CommandItem onSelect={() => run(() => setTodoFormOpen(true))}>
            <Plus />
            New task
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => setEventFormOpen(true))}>
            <CalendarPlus />
            New event
            <CommandShortcut>⌘E</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => navigate("/")}>
            <House />
            Home
          </CommandItem>
          <CommandItem onSelect={() => navigate("/todos/today")}>
            <Star />
            Today
          </CommandItem>
          <CommandItem onSelect={() => navigate("/todos")}>
            <Inbox />
            Inbox
          </CommandItem>
          <CommandItem onSelect={() => navigate("/todos/completed")}>
            <CheckSquare />
            Completed
          </CommandItem>
          <CommandItem onSelect={() => navigate("/calendar")}>
            <Calendar />
            Calendar
          </CommandItem>
          <CommandItem onSelect={() => navigate("/todos/stats")}>
            <BarChart2 />
            Stats
          </CommandItem>
        </CommandGroup>

        {/* Projects */}
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => navigate(`/todos/project/${p.id}`)}
                >
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                  <ChevronRight className="ml-auto size-3 text-muted-foreground" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Todo search */}
        {topTodos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {topTodos.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.title}
                  onSelect={() => navigate("/todos/today")}
                  className="flex items-center gap-2"
                >
                  <span
                    className={`size-1.5 rounded-full shrink-0 ${
                      t.priority === "high"
                        ? "bg-destructive"
                        : t.priority === "medium"
                        ? "bg-amber-500"
                        : "bg-muted-foreground/40"
                    }`}
                  />
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
