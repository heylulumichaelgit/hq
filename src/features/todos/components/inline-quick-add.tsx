"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import type { Priority } from "@/lib/supabase/types";
import {
  Plus,
  Calendar,
  Flag,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { parseDateFromText } from "@/lib/parse-date";
import { AssigneePicker } from "./assignee-picker";

interface InlineQuickAddProps {
  parentId?: string;
  projectId?: string | null;
  defaultSection?: string;
  defaultAssignedTo?: string;
  defaultPriority?: Priority;
  onDone?: () => void;
  placeholder?: string;
}

export function InlineQuickAdd({
  parentId,
  projectId,
  defaultSection,
  defaultAssignedTo = "Andrew,Chrystalla",
  defaultPriority = "medium",
  onDone,
  placeholder = "Add task...",
}: InlineQuickAddProps) {
  const [isExpanded, setIsExpanded] = useState(!!parentId);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>(defaultPriority);
  const [assignedTo, setAssignedTo] = useState<string>(defaultAssignedTo);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const createTodo = useCreateTodo();

  const parsedDate = useMemo(() => parseDateFromText(title), [title]);

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

    // Use NLP-parsed date if no manual date set and we found one
    const effectiveDueDate = dueDate || (parsedDate ? parsedDate.dateStr : null);
    const effectiveTitle = (parsedDate && !dueDate) ? parsedDate.textWithoutDate || title.trim() : title.trim();

    try {
      await createTodo.mutateAsync({
        title: effectiveTitle,
        priority,
        assigned_to: assignedTo,
        due_date: effectiveDueDate,
        created_by: user.id,
        parent_id: parentId || null,
        project_id: projectId ?? null,
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

      {/* NLP date preview */}
      <AnimatePresence>
        {parsedDate && !dueDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5"
          >
            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 rounded px-2 py-0.5">
              <Calendar className="h-3 w-3" />
              {parsedDate.label}
            </span>
            <span className="text-xs text-muted-foreground">detected — will be set on add</span>
          </motion.div>
        )}
      </AnimatePresence>

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

        <AssigneePicker value={assignedTo} onChange={setAssignedTo} compact />

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
