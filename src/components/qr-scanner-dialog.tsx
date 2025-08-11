"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeError, Html5QrcodeResult } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
  const minEdgePercentage = 0.7;
  const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
  const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
  return {
      width: qrboxSize,
      height: qrboxSize,
  };
}

export default function QrScannerDialog({
  open,
  onOpenChange,
  onScanSuccess,
  onScanError,
}: QrScannerDialogProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // start copy
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;

    if (open) {
      // Check if the element exists before initializing the scanner
      const readerElement = document.getElementById("reader");
      if (readerElement) {
      scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 10,
          qrbox: qrboxFunction,
          rememberLastUsedCamera: true,
          supportedScanTypes: [],
        },
        false
      );
      scannerRef.current = scanner;

      const handleSuccess = (decodedText: string, decodedResult: Html5QrcodeResult) => {
        onScanSuccess(decodedText);
      };

      const handleError = (error: Html5QrcodeError) => {
        // This can be noisy. We can ignore certain errors.
        // console.warn(error);
      };

      scanner.render(handleSuccess, handleError);
      }
    }

  return () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(error => {
        console.error("Failed to clear html5-qrcode-scanner on unmount.", error);
      });
      scannerRef.current = null;
    }
  };
}, [open, onScanSuccess, onScanError]);

  // end copy

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Scan School QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code provided by the school.
          </DialogDescription>
        </DialogHeader>
        <div id="reader" className="w-full" />
      </DialogContent>
    </Dialog>
  );
}
