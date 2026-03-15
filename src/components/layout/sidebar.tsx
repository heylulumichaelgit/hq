"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ShoppingCart,
  Calendar,
  Plane,
  Home,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  Folder,
  Pencil,
  Trash2,
  Inbox,
  Star,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PushToggle } from "@/features/notifications/push-toggle";
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject } from "@/features/projects/queries";

const navItems = [
  { href: "/todos/today", label: "Today", icon: Star, ready: true },
  { href: "/todos/upcoming", label: "Upcoming", icon: Calendar, ready: true },
  { href: "/todos", label: "Inbox", icon: Inbox, ready: true },
  { href: "/todos/completed", label: "Completed", icon: CheckSquare, ready: true },
  { href: "/todos/stats", label: "Stats", icon: BarChart2, ready: true },
  { href: "/grocery", label: "Grocery List", icon: ShoppingCart, ready: false },
  { href: "/bookings", label: "Bookings", icon: Plane, ready: false },
];

const PROJECT_COLORS = [
  "#6366f1", "#ef4444", "#f97316", "#f59e0b",
  "#22c55e", "#14b8a6", "#3b82f6", "#a855f7", "#ec4899",
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, reset } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: projects = [] } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const newProjectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingProject) newProjectInputRef.current?.focus();
  }, [addingProject]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !profile) return;
    await createProject.mutateAsync({
      name: newProjectName.trim(),
      color: newProjectColor,
      position: projects.length,
      created_by: profile.id,
    });
    setNewProjectName("");
    setNewProjectColor(PROJECT_COLORS[0]);
    setAddingProject(false);
  };

  const handleRenameProject = async (id: string) => {
    if (!editingName.trim()) return;
    await updateProject.mutateAsync({ id, name: editingName.trim() });
    setEditingProjectId(null);
  };

  const handleLogout = () => {
    setMobileOpen(false);
    reset();
    // Fire and forget — don't let a broken session block logout
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});
    // Clear Supabase cookies manually in case signOut hangs
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    window.location.href = "/login";
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          M
        </div>
        <div>
          <h1 className="text-lg font-bold">Michael Family</h1>
          <p className="text-xs text-muted-foreground">Family Hub</p>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.ready ? item.href : "#"}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                !item.ready && "opacity-50 cursor-not-allowed"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
              {!item.ready && (
                <span className="ml-auto text-xs opacity-70">Soon</span>
              )}
            </Link>
          );
        })}

        {/* Projects section */}
        <div className="pt-3">
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Projects
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setAddingProject(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {projects.map((project) => {
            const isActive = pathname === `/todos/project/${project.id}`;
            return (
              <div key={project.id} className="group relative">
                {editingProjectId === project.id ? (
                  <div className="flex items-center gap-1 px-3 py-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameProject(project.id);
                        if (e.key === "Escape") setEditingProjectId(null);
                      }}
                      onBlur={() => handleRenameProject(project.id)}
                      className="h-7 text-xs px-1 border-0 shadow-none focus-visible:ring-1"
                      autoFocus
                    />
                  </div>
                ) : (
                  <Link
                    href={`/todos/project/${project.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[40px]",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="flex-1 truncate">{project.name}</span>
                    <span className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingProjectId(project.id);
                          setEditingName(project.name);
                        }}
                        className="p-0.5 rounded hover:bg-background/50"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteProject.mutate(project.id);
                        }}
                        className="p-0.5 rounded hover:bg-background/50 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  </Link>
                )}
              </div>
            );
          })}

          {/* New project inline form */}
          <AnimatePresence>
            {addingProject && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 py-2 space-y-2"
              >
                <Input
                  ref={newProjectInputRef}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProject();
                    if (e.key === "Escape") {
                      setAddingProject(false);
                      setNewProjectName("");
                    }
                  }}
                  placeholder="Project name..."
                  className="h-8 text-sm"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewProjectColor(c)}
                      className={cn(
                        "h-5 w-5 rounded-full transition-transform",
                        newProjectColor === c && "ring-2 ring-offset-1 ring-foreground scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim() || createProject.isPending}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      setAddingProject(false);
                      setNewProjectName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      <Separator />

      <div className="p-3 space-y-2">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
              {profile.display_name.charAt(0)}
            </div>
            <span className="text-sm font-medium truncate flex-1">
              {profile.display_name}
            </span>
            <PushToggle />
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[48px]"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[48px] text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[48px] min-w-[48px]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Home className="h-5 w-5" />
        <span className="font-bold">Michael Family</span>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full w-[280px] border-r bg-background md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col md:border-r md:bg-background h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
