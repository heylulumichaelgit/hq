"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import {
  Camera,
  Upload,
  FileText,
  X,
  Loader2,
  Receipt,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCreateExpense } from "../queries";
import { useAuthStore } from "@/features/auth/store";
import { toast } from "sonner";

const CATEGORIES = [
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Healthcare",
  "Shopping",
  "Entertainment",
  "Home",
  "Other",
] as const;

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD"];

interface UploadResult {
  path: string;
  url: string | null;
  mock?: boolean;
}

interface ExtractedExpense {
  amount: number | null;
  currency: string | null;
  date: string | null;
  description: string | null;
  category: string | null;
}

export function ReceiptCapture() {
  const { user } = useAuthStore();
  const createExpense = useCreateExpense();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiExtracted, setAiExtracted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Form state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState<string>("Other");
  const [date, setDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const extractFromReceipt = useCallback(async (imageFile: File) => {
    if (!imageFile.type.startsWith("image/")) return;

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const res = await fetch("/api/expenses/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) return;

      const { extracted }: { extracted: ExtractedExpense } = await res.json();

      // Auto-fill fields with extracted values
      if (extracted.description) setDescription(extracted.description);
      if (extracted.amount != null) setAmount(String(extracted.amount));
      if (extracted.currency && CURRENCIES.includes(extracted.currency)) {
        setCurrency(extracted.currency);
      }
      if (extracted.category) setCategory(extracted.category);
      if (extracted.date) setDate(extracted.date);

      setAiExtracted(true);
      toast.success("Receipt details extracted");
    } catch {
      // Silently fail — user can fill in manually
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const handleFile = useCallback(
    (selected: File) => {
      setFile(selected);
      setAiExtracted(false);
      if (selected.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(selected));
        extractFromReceipt(selected);
      } else {
        setPreview(null);
      }
    },
    [extractFromReceipt]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile]
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const clearFile = () => {
    setFile(null);
    setAiExtracted(false);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Uploading receipt…");

    let receiptUrl: string | null = null;
    let dropboxPath: string | null = null;

    try {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        setUploadProgress("Uploading to Dropbox…");
        const res = await fetch("/api/expenses/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed");
        }

        const result: UploadResult = await res.json();
        dropboxPath = result.path ?? null;
        receiptUrl = result.url ?? null;

        if (result.mock) {
          toast.info(
            "Dropbox not configured — receipt metadata saved without file."
          );
        }
      }

      setUploadProgress("Saving expense…");

      await createExpense.mutateAsync({
        date,
        amount: amount ? parseFloat(amount) : null,
        currency,
        description: description.trim(),
        category,
        receipt_url: receiptUrl,
        dropbox_path: dropboxPath,
        uploaded_by: user?.id ?? null,
      });

      // Reset form
      setDescription("");
      setAmount("");
      setCurrency("EUR");
      setCategory("Other");
      setDate(new Date().toISOString().split("T")[0]);
      setAiExtracted(false);
      clearFile();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save expense"
      );
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const isPdf = file?.type === "application/pdf";
  const isBusy = isUploading || isExtracting;

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone / camera area */}
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors cursor-pointer py-8 px-4",
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" && fileInputRef.current?.click()
                  }
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Upload className="size-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        Drop a receipt or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Images or PDF
                      </p>
                    </div>
                  </div>

                  {/* Camera capture button (mobile-prominent) */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                  >
                    <Camera className="size-4" />
                    Take photo
                  </Button>

                  {/* Hidden inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="relative"
              >
                <div className="relative flex items-center justify-center rounded-lg border bg-muted/30 overflow-hidden min-h-32">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="max-h-48 w-auto object-contain rounded"
                    />
                  ) : isPdf ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                      <FileText className="size-10" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                  ) : null}

                  {isExtracting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                      <div className="flex items-center gap-2 rounded-full bg-background/90 border px-4 py-2 shadow-sm">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="text-sm font-medium">
                          Reading receipt…
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 size-7 rounded-full shadow"
                    onClick={clearFile}
                    disabled={isExtracting}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI extracted indicator */}
          <AnimatePresence>
            {aiExtracted && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="size-3 text-primary" />
                  <span>AI extracted — review and edit before saving</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="description"
                placeholder="e.g. Office chair from IKEA"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={isBusy}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={currency}
                  onValueChange={setCurrency}
                  disabled={isBusy}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={isBusy}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={isBusy || !description.trim()}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {uploadProgress || "Saving…"}
              </>
            ) : (
              <>
                <Receipt className="size-4" />
                Save Receipt
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
