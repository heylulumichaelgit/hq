"use client";

import { useState } from "react";
import { TodoList } from "@/features/todos/components/todo-list";
import { TodoFilters } from "@/features/todos/components/todo-filters";
import { motion } from "framer-motion";
import { useMyPerson } from "@/features/todos/hooks/use-my-person";

export default function TodosPage() {
  const myPerson = useMyPerson();
  const [showAll, setShowAll] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="flex items-center rounded-md border p-0.5 text-xs">
          <button
            onClick={() => setShowAll(false)}
            className={`rounded px-2.5 py-1 transition-colors ${!showAll ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Mine
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`rounded px-2.5 py-1 transition-colors ${showAll ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
        </div>
      </div>
      <TodoFilters />
      <TodoList personFilter={!showAll && myPerson ? myPerson : undefined} />
    </motion.div>
  );
}
