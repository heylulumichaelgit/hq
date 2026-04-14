"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { useAddGroceryItems } from "../queries";
import { useAuthStore } from "@/features/auth/store";
import { cn } from "@/lib/utils";
import type { GroceryCategory } from "@/features/grocery/constants";

interface ParsedGroceryItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
}
interface ParseResult {
  items: ParsedGroceryItem[];
  suggestions: string[];
}
import { motion, AnimatePresence } from "framer-motion";

interface GroceryInputProps {
  onSuggestionsReceived?: (suggestions: string[]) => void;
}

export function GroceryInput({ onSuggestionsReceived }: GroceryInputProps) {
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuthStore();
  const addItems = useAddGroceryItems();

  const handleTranscript = useCallback((transcript: string) => {
    setInput((prev) => (prev ? prev + ", " + transcript : transcript));
    textareaRef.current?.focus();
  }, []);

  const { isListening, isSupported, interimTranscript, start, stop } = useVoiceInput({
    onTranscript: handleTranscript,
  });

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isParsing) return;

    setIsParsing(true);
    try {
      const res = await fetch("/api/grocery/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text }),
      });

      const result: ParseResult = await res.json();

      const basePosition = Math.floor(Date.now() / 1000);

      await addItems.mutateAsync(
        result.items.map((item, i) => ({
          name: item.name,
          category: item.category,
          quantity: item.quantity ?? null,
          unit: item.unit ?? null,
          is_checked: false,
          added_by: user?.id ?? null,
          position: basePosition + i,
        }))
      );

      if (result.suggestions?.length) {
        onSuggestionsReceived?.(result.suggestions);
      }

      setInput("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayText = isListening && interimTranscript
    ? (input ? input + ", " : "") + interimTranscript
    : input;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={displayText}
            onChange={(e) => !isListening && setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? "Listening…"
                : "Add items — type anything or use your voice.\nE.g. \"2kg tomatoes, olive oil, stuff for pasta night\""
            }
            rows={2}
            className={cn(
              "resize-none pr-10 text-sm transition-colors",
              isListening && "border-red-400 dark:border-red-500 focus-visible:ring-red-400"
            )}
            readOnly={isListening}
          />
          {isListening && (
            <span className="absolute top-2 right-3 flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-red-500" />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isSupported && (
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={isListening ? stop : start}
              aria-label={isListening ? "Stop recording" : "Start voice input"}
              className="shrink-0"
            >
              {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || isParsing}
            aria-label="Add items"
            className="shrink-0"
          >
            {isParsing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isParsing && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Sparkles className="size-3 animate-pulse" />
            Parsing with AI…
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

interface SuggestionBannerProps {
  suggestions: string[];
  onAccept: (item: string) => void;
  onDismiss: () => void;
}

export function SuggestionBanner({ suggestions, onAccept, onDismiss }: SuggestionBannerProps) {
  if (!suggestions.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border border-dashed bg-muted/40 px-3 py-2.5 flex flex-wrap items-center gap-2"
    >
      <Sparkles className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground shrink-0">Suggested:</span>
      {suggestions.map((s) => (
        <Badge
          key={s}
          variant="outline"
          className="cursor-pointer hover:bg-accent transition-colors text-xs"
          onClick={() => onAccept(s)}
        >
          + {s}
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="size-5 ml-auto shrink-0"
        onClick={onDismiss}
      >
        <X className="size-3" />
      </Button>
    </motion.div>
  );
}
