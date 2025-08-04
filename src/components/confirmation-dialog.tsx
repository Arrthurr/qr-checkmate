"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ReactNode } from "react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: boolean;
  title: string;
  description?: string;
  icon: ReactNode;
}

export default function ConfirmationDialog({
  open,
  onOpenChange,
  status,
  title,
  description,
  icon,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-4">
            {icon}
          </div>
          <AlertDialogTitle className="text-center text-2xl font-headline">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-center text-base">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)} className="w-full">
            Close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
