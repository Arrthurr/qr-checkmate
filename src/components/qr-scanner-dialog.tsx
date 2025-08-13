"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeError, Html5QrcodeResult } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMountedFlag } from "@/hooks/use-mounted-flag";

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
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export default function QrScannerDialog({
  open,
  onOpenChange,
  onScanSuccess,
  onScanError,
}: QrScannerDialogProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef<boolean>(false);
  // Give the container a predictable ID only once for the component lifecycle
  const readerElementIdRef = useRef<string>("qr-reader");
  const isClient = useMountedFlag();

  const startScanner = async (el: HTMLDivElement) => {
    // Avoid double init
    if (scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      readerElementIdRef.current,
      {
        fps: 10,
        qrbox: qrboxFunction,
        rememberLastUsedCamera: true,
        // Use default scan types; library will pick camera stream
        supportedScanTypes: [],
      },
      false
    );
    scannerRef.current = scanner;

    const handleSuccess = (decodedText: string, _decodedResult: Html5QrcodeResult) => {
      onScanSuccess(decodedText);
    };

    const handleError = (_error: Html5QrcodeError) => {
      // html5-qrcode emits frequent non-fatal errors; surface via callback if needed
      // onScanError?.(typeof _error === 'string' ? _error : _error?.message ?? "Scan error");
    };

    try {
      scanner.render(handleSuccess, handleError);
    } catch (e: any) {
      onScanError(e?.message ?? "Failed to start QR scanner");
    }
  };

  // Initialize only after mount, open, and layout (DOM timing safe)
  useEffect(() => {
    if (!isClient || !open) return;
    if (!containerRef.current) return;
    if (startingRef.current || scannerRef.current) return;

    const run = async () => {
      startingRef.current = true;
      try {
        await nextFrame();
        await nextFrame();

        // Validate container still exists, dialog still open, and has a non-zero size
        const el = containerRef.current;
        if (!el || !open) return;
        if (el.clientWidth === 0 || el.clientHeight === 0) return;

        await startScanner(el);
      } finally {
        startingRef.current = false;
      }
    };

    run();
  }, [isClient, open, containerRef]);

  // Cleanup when dialog closes or on unmount
  useEffect(() => {
    if (!open && scannerRef.current) {
      scannerRef.current
        .clear()
        .catch((error) => {
          console.error("Failed to clear html5-qrcode-scanner on unmount.", error);
        })
        .finally(() => {
          scannerRef.current = null;
          const el = containerRef.current;
          if (el) el.innerHTML = "";
          // best-effort: stop any held stream tracks if we stored one in the future
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        });
    }
  }, [open]);

  if (!isClient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Scan School QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code provided by the school.
          </DialogDescription>
        </DialogHeader>
        <div
          id={readerElementIdRef.current}
          ref={containerRef}
          className="w-full min-h-[280px] relative overflow-hidden max-h-[70vh]"
        />
      </DialogContent>
    </Dialog>
  );
}
