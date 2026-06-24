"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type InviteMembersModalProps = {
  roomId: string;
  roomName: string;
};

export function InviteMembersModal({ roomId, roomName }: InviteMembersModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/groups/${encodeURIComponent(roomId)}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate invite code");
        setInviteCode(null);
        return;
      }
      setInviteCode(data.invite.code);
      setCopied(false);
    } catch {
      toast.error("Failed to generate invite code");
      setInviteCode(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setInviteCode(null);
      setCopied(false);
      generateCode();
    }
  };

  const handleCopy = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      toast.success("Invite code copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy — please copy the code manually");
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border border-border/50 bg-card p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl mx-4 sm:mx-0">
          <div className="flex items-start justify-between mb-5">
            <div>
              <Dialog.Title className="text-base font-semibold">Invite Members</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mt-0.5">
                Share this code so others can join{" "}
                <span className="font-medium text-foreground">{roomName}</span>.
              </Dialog.Description>
            </div>
            <Dialog.Close className="mt-0.5 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            {isGenerating && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generating code…</span>
              </div>
            )}

            {!isGenerating && inviteCode && (
              <>
                <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Invite Code
                  </p>
                  <p className="font-mono text-sm break-all text-foreground leading-relaxed select-all">
                    {inviteCode}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                    copied
                      ? "bg-green-500/15 border border-green-500/40 text-green-600 dark:text-green-400"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Invite Code
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={generateCode}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate a new code
                </button>
              </>
            )}

            {!isGenerating && !inviteCode && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Could not generate an invite code.
                </p>
                <button
                  type="button"
                  onClick={generateCode}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try again
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
