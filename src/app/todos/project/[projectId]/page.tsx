"use client";

import { use, useState } from "react";
import { TodoList } from "@/features/todos/components/todo-list";
import { TodoFilters } from "@/features/todos/components/todo-filters";
import { TodoFormDialog } from "@/features/todos/components/todo-form-dialog";
import { TodoBoard } from "@/features/todos/components/todo-board";
import { useProjects } from "@/features/projects/queries";
import { motion } from "framer-motion";
import { Folder, List, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = use(params);
  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const [view, setView] = useState<"list" | "board">("list");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {project && (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{ backgroundColor: project.color + "22" }}
            >
              <Folder
                className="h-5 w-5"
                style={{ color: project.color }}
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name ?? "Project"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Project tasks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
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
          <TodoFormDialog defaultProjectId={projectId} />
        </div>
      </div>

      {view === "list" ? (
        <>
          <TodoFilters />
          <TodoList projectId={projectId} />
        </>
      ) : (
        <div className="overflow-x-auto">
          <TodoBoard projectId={projectId} />
        </div>
      )}
    </motion.div>
  );
}
