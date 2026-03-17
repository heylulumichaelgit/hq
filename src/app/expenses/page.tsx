"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Info } from "lucide-react";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { ReceiptCapture } from "@/features/expenses/components/receipt-capture";
import { ExpenseList } from "@/features/expenses/components/expense-list";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ExpensesPage() {
  const { setSlot } = useHeaderSlot();
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    setSlot(
      <div className="flex items-center gap-2">
        <Receipt className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold">Expenses</span>
      </div>
    );
    return () => setSlot(null);
  }, [setSlot]);

  // Check whether Dropbox is configured (fire-and-forget health check)
  useEffect(() => {
    fetch("/api/expenses/upload")
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => {
        setDropboxConfigured(data.configured ?? false);
      })
      .catch(() => setDropboxConfigured(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Dropbox not-configured notice */}
      {dropboxConfigured === false && (
        <Alert variant="default" className="border-muted bg-muted/40">
          <Info className="size-4" />
          <AlertDescription className="text-xs text-muted-foreground">
            Dropbox is not configured. Expense metadata will still be saved, but
            receipts won&apos;t be uploaded. Set{" "}
            <code className="font-mono text-[11px]">DROPBOX_ACCESS_TOKEN</code>{" "}
            (and optionally{" "}
            <code className="font-mono text-[11px]">DROPBOX_FOLDER_PATH</code>)
            in your environment to enable receipt uploads.
          </AlertDescription>
        </Alert>
      )}

      {/* Receipt capture form */}
      <ReceiptCapture />

      {/* Past expenses */}
      <ExpenseList />
    </motion.div>
  );
}
