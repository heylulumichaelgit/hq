"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTodo } from "../queries";
import { useAuthStore } from "@/features/auth/store";
import type { Priority, AssignedTo } from "@/lib/supabase/types";
import {
  Plus,
  Calendar,
  Flag,
  User,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InlineQuickAddProps {
  parentId?: string;
  defaultSection?: string;
  defaultAssignedTo?: AssignedTo;
  defaultPriority?: Priority;
  onDone?: () => void;
  placeholder?: string;
}

export function InlineQuickAdd({
  parentId,
  defaultSection,
  defaultAssignedTo = "Both",
  defaultPriority = "medium",
  onDone,
  placeholder = "Add task...",
}: InlineQuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(!!parentId);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>(defaultPriority);
  const [assignedTo, setAssignedTo] = useState<AssignedTo>(defaultAssignedTo);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const createTodo = useCreateTodo();

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const reset = () => {
    setTitle("");
    setDueDate("");
    setPriority(defaultPriority);
    setAssignedTo(defaultAssignedTo);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;

    try {
      await createTodo.mutateAsync({
        title: title.trim(),
        priority,
        assigned_to: assignedTo,
        due_date: dueDate || null,
        created_by: user.id,
        parent_id: parentId || null,
        section: defaultSection || null,
      });
      reset();
      inputRef.current?.focus();
      if (parentId) onDone?.();
    } catch {
      // Error is handled by react-query
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      reset();
      setIsExpanded(false);
      onDone?.();
    }
  };

  const handleCancel = () => {
    reset();
    setIsExpanded(false);
    onDone?.();
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-dashed px-4 py-3",
          "text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30",
          "transition-colors cursor-pointer"
        )}
      >
        <Plus className="h-4 w-4 text-primary" />
        Add task
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-primary/30 p-3 space-y-2"
    >
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="border-0 p-0 h-auto text-sm font-medium shadow-none focus-visible:ring-0"
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-7 text-xs bg-transparent border rounded px-1.5 border-input"
          />
        </div>

        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
          <SelectTrigger className="h-7 w-auto gap-1 text-xs px-2 border">
            <Flag className="h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v as AssignedTo)}>
          <SelectTrigger className="h-7 w-auto gap-1 text-xs px-2 border">
            <User className="h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Andrew">Andrew</SelectItem>
            <SelectItem value="Chrystalla">Chrystalla</SelectItem>
            <SelectItem value="Both">Both</SelectItem>
            <SelectItem value="Lulu">Lulu</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleCancel}
        >
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={handleSubmit}
          disabled={!title.trim() || createTodo.isPending}
        >
          {createTodo.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Add"
          )}
        </Button>
      </div>
    </motion.div>
  );
}
