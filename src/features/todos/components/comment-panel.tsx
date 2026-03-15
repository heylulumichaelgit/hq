"use client";

import { useState, useRef, useEffect } from "react";
import { useComments, useCreateComment, useDeleteComment } from "@/features/comments/queries";
import { useAuthStore } from "@/features/auth/store";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CommentPanelProps {
  todoId: string;
}

export function CommentPanel({ todoId }: CommentPanelProps) {
  const [body, setBody] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const { data: comments = [], isLoading } = useComments(todoId, true);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSubmit = async () => {
    if (!body.trim() || !user) return;
    const text = body.trim();
    setBody("");
    await createComment.mutateAsync({ todo_id: todoId, created_by: user.id, body: text });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t mt-1 pt-3 space-y-3"
    >
      {isLoading && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-1">
          No comments yet
        </p>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        <AnimatePresence>
          {comments.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="group flex items-start gap-2"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold mt-0.5">
                {c.profiles?.display_name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium">
                    {c.profiles?.display_name ?? "Unknown"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">{c.body}</p>
              </div>
              {c.created_by === user?.id && (
                <button
                  onClick={() => deleteComment.mutate({ id: c.id, todoId })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... (Enter to send)"
          rows={1}
          className={cn(
            "flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-xs",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "placeholder:text-muted-foreground"
          )}
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleSubmit}
          disabled={!body.trim() || createComment.isPending}
        >
          {createComment.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Send className="h-3.5 w-3.5" />
          }
        </Button>
      </div>
    </motion.div>
  );
}
