"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ShoppingCart,
  Calendar,
  Plane,
  LogOut,
  Sun,
  Moon,
  Plus,
  Pencil,
  Trash2,
  Inbox,
  Star,
  BarChart2,
  CirclePlus,
  MoreHorizontal,
  House,
  Users,
  Receipt,
  UtensilsCrossed,
} from "lucide-react";
import { FamilyAvatar } from "@/components/family-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/features/auth/store";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PushToggle } from "@/features/notifications/push-toggle";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
} from "@/features/projects/queries";

const navMain = [
  { href: "/", label: "Home", icon: House },
  { href: "/todos/today", label: "Today", icon: Star },
  { href: "/todos", label: "Inbox", icon: Inbox },
  { href: "/todos/completed", label: "Completed", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

const navBottom = [
  { href: "/todos/stats", label: "Stats", icon: BarChart2 },
];

const navSecondary = [
  { href: "/grocery", label: "Grocery List", icon: ShoppingCart, soon: false },
  { href: "/meals", label: "Meal Planner", icon: UtensilsCrossed, soon: false },
  { href: "/holidays", label: "Holidays", icon: Plane, soon: false },
  { href: "/services", label: "Services", icon: Users, soon: false },
  { href: "/expenses", label: "Expenses", icon: Receipt, soon: false },
];

const PROJECT_COLORS = [
  "#C4956A", "#B5896E", "#C9B99A",
  "#8FA48A", "#8B9672", "#9B8E7E",
  "#C49A9A", "#7A8FA0", "#8B8680",
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { profile, reset } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
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
    reset();
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    window.location.href = "/login";
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* ── Header: brand ── */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  M
                </div>
                <span className="text-base font-semibold">HQ</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Nav Main ── */}
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Add Todo"
                  className="min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                >
                  <Link href="/todos?new=1">
                    <CirclePlus className="size-4" />
                    <span>Add Todo</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarMenu>
              {navMain.map((item) => {
                const isActive =
                  item.href === "/" || item.href === "/todos"
                    ? pathname === item.href
                    : pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Projects ── */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="flex items-center">
            Projects
            <button
              onClick={() => setAddingProject(true)}
              className="ml-auto flex h-5 w-5 items-center justify-center rounded-sm hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span className="sr-only">New project</span>
            </button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => {
                const isActive = pathname === `/todos/project/${project.id}`;
                return (
                  <SidebarMenuItem key={project.id}>
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
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
                          className="h-6 text-xs px-1 border-0 shadow-none focus-visible:ring-1"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={`/todos/project/${project.id}`}>
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <span>{project.name}</span>
                          </Link>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction
                              showOnHover
                              className="rounded-sm data-[state=open]:bg-accent"
                            >
                              <MoreHorizontal className="size-3.5" />
                              <span className="sr-only">More</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-32 rounded-lg"
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingProjectId(project.id);
                                setEditingName(project.name);
                              }}
                            >
                              <Pencil className="size-3.5" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => deleteProject.mutate(project.id)}
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            <AnimatePresence>
              {addingProject && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-2 py-2 space-y-2"
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
                    className="h-7 text-xs"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewProjectColor(c)}
                        className={cn(
                          "h-4 w-4 rounded-full transition-transform",
                          newProjectColor === c &&
                            "ring-2 ring-offset-1 ring-foreground scale-110"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-6 flex-1 text-xs"
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim() || createProject.isPending}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs"
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
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Household features ── */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Household</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    {item.soon ? (
                      <SidebarMenuButton disabled className="opacity-50 cursor-not-allowed">
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                        <Link href={item.href}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Stats (pinned to bottom) ── */}
        <SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
          <SidebarGroupContent>
            <SidebarMenu>
              {navBottom.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer: user dropdown ── */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <FamilyAvatar
                    name={profile?.display_name}
                    avatarUrl={profile?.avatar_url}
                    className="h-8 w-8 rounded-lg"
                    fallbackClassName="rounded-lg text-sm font-bold"
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {profile?.display_name ?? "Loading…"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {profile?.email ?? ""}
                    </span>
                  </div>
                  <MoreHorizontal className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <FamilyAvatar
                      name={profile?.display_name}
                      avatarUrl={profile?.avatar_url}
                      className="h-8 w-8 rounded-lg"
                      fallbackClassName="rounded-lg text-sm font-bold"
                    />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">
                        {profile?.display_name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {profile?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? (
                      <Sun className="size-4" />
                    ) : (
                      <Moon className="size-4" />
                    )}
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <div className="flex items-center gap-2 px-2 py-1.5 cursor-default select-none rounded-sm text-sm hover:bg-accent">
                      <span className="flex-1">Notifications</span>
                      <PushToggle />
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
