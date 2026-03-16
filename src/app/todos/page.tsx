"use client";

import { useState, useEffect } from "react";
import { TodoList } from "@/features/todos/components/todo-list";
import { TodoFilters } from "@/features/todos/components/todo-filters";
import { motion } from "framer-motion";
import { useMyPerson } from "@/features/todos/hooks/use-my-person";
import { useHeaderSlot } from "@/components/layout/header-slot-context";

export default function TodosPage() {
  const myPerson = useMyPerson();
  const [showAll, setShowAll] = useState(false);
  const { setSlot } = useHeaderSlot();

  useEffect(() => {
    setSlot(
      <>
        <span className="text-sm font-semibold shrink-0">Inbox</span>
        <div className="flex items-center rounded-md border p-0.5 text-xs shrink-0">
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
        <div className="flex-1" />
        <TodoFilters />
      </>
    );
    return () => setSlot(null);
  }, [showAll, setSlot]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <TodoList personFilter={!showAll && myPerson ? myPerson : undefined} />
    </motion.div>
  );
}
