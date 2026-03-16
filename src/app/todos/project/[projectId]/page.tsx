"use client";

import { use, useState, useEffect } from "react";
import { TodoList } from "@/features/todos/components/todo-list";
import { TodoFilters } from "@/features/todos/components/todo-filters";
import { TodoBoard } from "@/features/todos/components/todo-board";
import { useProjects } from "@/features/projects/queries";
import { motion } from "framer-motion";
import { Folder, List, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeaderSlot } from "@/components/layout/header-slot-context";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const [view, setView] = useState<"list" | "board">("list");
  const { setSlot } = useHeaderSlot();

  useEffect(() => {
    setSlot(
      <>
        {project && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded shrink-0"
            style={{ backgroundColor: project.color + "22" }}
          >
            <Folder className="h-3.5 w-3.5" style={{ color: project.color }} />
          </div>
        )}
        <span className="text-sm font-semibold truncate">
          {project?.name ?? "Project"}
        </span>
        <div className="flex-1" />
        {view === "list" && <TodoFilters />}
        <div className="flex items-center gap-0.5 rounded-lg border p-0.5 shrink-0">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "board" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setView("board")}
          >
            <LayoutDashboard className="h-4 w-4" />
          </Button>
        </div>
      </>
    );
    return () => setSlot(null);
  }, [setSlot, project, view]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {view === "list" ? (
        <TodoList projectId={projectId} />
      ) : (
        <div className="overflow-x-auto">
          <TodoBoard projectId={projectId} />
        </div>
      )}
    </motion.div>
  );
}
