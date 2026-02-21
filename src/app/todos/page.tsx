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
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Family Todos</h1>
          <p className="text-sm text-muted-foreground">
            Shared task list for the family
          </p>
        </div>
        <TodoFormDialog />
      </div>

      <TodoFilters />
      <TodoList />
    </motion.div>
  );
}
