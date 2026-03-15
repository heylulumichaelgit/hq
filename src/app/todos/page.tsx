"use client";

import { TodoList } from "@/features/todos/components/todo-list";
import { TodoFilters } from "@/features/todos/components/todo-filters";
import { TodoFormDialog } from "@/features/todos/components/todo-form-dialog";
import { motion } from "framer-motion";

export default function TodosPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Tasks not assigned to any project
          </p>
        </div>
        <TodoFormDialog defaultProjectId={null} />
      </div>

      <TodoFilters />
      <TodoList projectId={null} />
    </motion.div>
  );
}
