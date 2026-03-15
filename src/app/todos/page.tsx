"use client";

import { TodoList } from "@/features/todos/components/todo-list";
import { TodoFilters } from "@/features/todos/components/todo-filters";
import { motion } from "framer-motion";

export default function TodosPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <h1 className="text-2xl font-bold">Inbox</h1>
      <TodoFilters />
      <TodoList projectId={null} />
    </motion.div>
  );
}
