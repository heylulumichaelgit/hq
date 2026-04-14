"use client";

import { useEffect, useCallback, useMemo } from "react";
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
  ShoppingCart,
  Users,
  UtensilsCrossed,
  FolderKanban,
  Clock3,
  Sparkles,
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
import { useGroceryItems } from "@/features/grocery/queries";
import { useServices } from "@/features/services/queries";
import { useMealPlans } from "@/features/meals/queries";
import { useFamilyEvents } from "@/features/calendar/queries";
import { startOfWeek, endOfWeek, format } from "date-fns";

function searchable(text: string | null | undefined) {
  return text?.toLowerCase().trim() ?? "";
}

export function CommandPalette() {
  const router = useRouter();
  const { paletteOpen, setPaletteOpen, setTodoFormOpen, setEventFormOpen } =
    useCommandStore();
  const { data: todos = [] } = useTodos();
  const { data: projects = [] } = useProjects();
  const { data: groceryItems = [] } = useGroceryItems();
  const { data: services = [] } = useServices();

  const currentWeekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );
  const weekStart = format(currentWeekStart, "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: mealPlans = [] } = useMealPlans(weekStart);
  const { data: familyEvents = [] } = useFamilyEvents(weekStart, weekEnd);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (mod && e.key === "t" && !paletteOpen) {
        e.preventDefault();
        setTodoFormOpen(true);
      }
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

  const taskResults = useMemo(
    () =>
      todos
        .filter((t) => !t.parent_id)
        .slice()
        .sort((a, b) => Number(a.is_completed) - Number(b.is_completed))
        .slice(0, 12),
    [todos]
  );

  const groceryResults = useMemo(
    () => groceryItems.slice(0, 10),
    [groceryItems]
  );

  const serviceResults = useMemo(() => services.slice(0, 10), [services]);
  const mealResults = useMemo(() => mealPlans.slice(0, 10), [mealPlans]);
  const eventResults = useMemo(() => familyEvents.slice(0, 10), [familyEvents]);

  return (
    <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen} showCloseButton={false}>
      <CommandInput placeholder="Search tasks, grocery, meals, services, calendar..." />
      <CommandList className="max-h-[500px]">
        <CommandEmpty>
          <Search className="size-8 mx-auto mb-2 text-muted-foreground/40" />
          No results found.
        </CommandEmpty>

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
          <CommandItem onSelect={() => navigate("/grocery")}>
            <ShoppingCart />
            Grocery List
          </CommandItem>
          <CommandItem onSelect={() => navigate("/calendar")}>
            <Calendar />
            Calendar
          </CommandItem>
          <CommandItem onSelect={() => navigate("/meals")}>
            <UtensilsCrossed />
            Meals
          </CommandItem>
          <CommandItem onSelect={() => navigate("/services")}>
            <Users />
            Services
          </CommandItem>
          <CommandItem onSelect={() => navigate("/todos/stats")}>
            <BarChart2 />
            Stats
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`project ${p.name}`}
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

        {taskResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {taskResults.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`task ${t.title} ${searchable(t.description)} ${searchable(t.assigned_to)} ${searchable(t.section)}`}
                  onSelect={() =>
                    navigate(t.project_id ? `/todos/project/${t.project_id}` : "/todos")
                  }
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
                  {t.is_completed && (
                    <span className="ml-auto text-[10px] uppercase text-muted-foreground">done</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {groceryResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Grocery">
              {groceryResults.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`grocery ${item.name} ${searchable(item.category)} ${searchable(item.notes)}`}
                  onSelect={() => navigate("/grocery")}
                >
                  <ShoppingCart />
                  <span className="truncate">{item.name}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                    {item.category}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {mealResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Meals">
              {mealResults.map((meal) => (
                <CommandItem
                  key={meal.id}
                  value={`meal ${meal.title} ${searchable(meal.notes)} ${searchable(meal.meal_type)}`}
                  onSelect={() => navigate("/meals")}
                >
                  <UtensilsCrossed />
                  <span className="truncate">{meal.title}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                    {meal.meal_type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {serviceResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Services">
              {serviceResults.map((service) => (
                <CommandItem
                  key={service.id}
                  value={`service ${service.name} ${searchable(service.category)} ${searchable(service.notes)} ${searchable(service.email)} ${searchable(service.phone)}`}
                  onSelect={() => navigate("/services")}
                >
                  <Users />
                  <span className="truncate">{service.name}</span>
                  {service.is_favourite ? (
                    <Sparkles className="ml-auto size-3 text-amber-500" />
                  ) : (
                    <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                      {service.category}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {eventResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Calendar">
              {eventResults.map((event) => (
                <CommandItem
                  key={event.id}
                  value={`calendar ${event.title} ${searchable(event.description)}`}
                  onSelect={() => navigate("/calendar")}
                >
                  <Clock3 />
                  <span className="truncate">{event.title}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                    {event.all_day ? "all day" : format(new Date(event.start_at), "EEE")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Tips">
          <CommandItem onSelect={() => navigate("/todos")}> 
            <FolderKanban />
            Search opens projects and the matching feature page
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
