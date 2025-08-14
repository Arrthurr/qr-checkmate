"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeError, Html5QrcodeResult } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMountedFlag } from "@/hooks/use-mounted-flag";

// Ensure the underlying <video> used by html5-qrcode has mobile-friendly autoplay attributes
function applyVideoAttributes(video: HTMLVideoElement) {
  try {
    // Attributes for iOS Safari inline playback
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    // Autoplay policy compliance
    video.muted = true;
    video.autoplay = true;
    video.setAttribute("muted", "true");
    video.setAttribute("autoplay", "true");
  } catch {}
}

function removeMirrorIfPresent(video: HTMLVideoElement) {
  try {
    const style = window.getComputedStyle(video);
    const hasMirror = /matrix\(-1,\s*0,\s*0,\s*1|scaleX\(-1\)/.test(style.transform || "") || /scaleX\(-1\)/.test(video.style.transform || "");
    if (hasMirror) {
      video.style.transform = "none";
    }
  } catch {}
}

function watchForVideo(container: HTMLElement, { enforceNoMirror }: { enforceNoMirror: boolean }) {
  const tryFix = () => {
    const video = container.querySelector("video") as HTMLVideoElement | null;
    if (video) {
      applyVideoAttributes(video);
      if (enforceNoMirror) removeMirrorIfPresent(video);
      return true;
    }
    return false;
  };

  if (tryFix()) return;

  const mo = new MutationObserver(() => {
    if (tryFix()) {
      mo.disconnect();
    }
  });
  mo.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
}

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

// Helper: choose the safest/best video constraints for mobile devices
async function selectBestVideoConstraints(): Promise<MediaTrackConstraints | boolean> {
  const matchBackLabel = (label: string) => /\b(back|rear|environment)\b/i.test(label);

  const stopStream = (s?: MediaStream | null) => {
    if (!s) return;
    try { s.getTracks().forEach(t => t.stop()); } catch {}
  };

  // 1) Try to get environment camera by facingMode ideal. If it works, lock to its deviceId for stability.
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    const track = s.getVideoTracks()[0];
    const settings = track?.getSettings?.();
    const deviceId = settings?.deviceId;
    stopStream(s);
    if (deviceId) {
      return { deviceId: { exact: deviceId } };
    }
    // If deviceId isn't exposed, still return the ideal facingMode; permission is granted now.
    return { facingMode: { ideal: "environment" } };
  } catch (err: any) {
    if (err?.name !== "OverconstrainedError") {
      // Non-constraint issues (e.g., NotAllowedError) will be handled later by the scanner UI
      // Proceed to fallback enumeration when possible.
    }
  }

  // 2) Ensure permission (looser constraint) to reveal device labels, then enumerate.
  let permissionStream: MediaStream | null = null;
  try {
    permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (err) {
    // If we still can't get permission, fall back to user-facing generic constraint to let library prompt UI.
    return { facingMode: "user" };
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === "videoinput");

    // Prefer labels indicating a back-facing camera
    const back = videoInputs.find(d => d.label && matchBackLabel(d.label));
    if (back?.deviceId) {
      return { deviceId: { exact: back.deviceId } };
    }

    // As a secondary heuristic, prefer the last camera on iOS/Safari which often lists back cameras later
    if (videoInputs.length > 1) {
      const last = videoInputs[videoInputs.length - 1];
      if (last?.deviceId) return { deviceId: { exact: last.deviceId } };
    }

    // 3) Final fallback to user-facing
    return { facingMode: "user" };
  } finally {
    stopStream(permissionStream);
  }
}

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

    // Compute best constraints with safe fallbacks and Overconstrained handling
    let videoConstraints: MediaTrackConstraints | boolean = { facingMode: { ideal: "environment" } };
    try {
      videoConstraints = await selectBestVideoConstraints();
    } catch (err) {
      // As a last resort, allow library defaults
      videoConstraints = true;
    }

    const scanner = new Html5QrcodeScanner(
      readerElementIdRef.current,
      {
        fps: 10,
        qrbox: qrboxFunction,
        rememberLastUsedCamera: true,
        // Prefer rear camera on mobile, with robust fallback
        videoConstraints,
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
      // After render, enforce mobile video attributes and mirroring rules
      const containerEl = document.getElementById(readerElementIdRef.current);
      if (containerEl) {
        const preferEnv = !!(
          videoConstraints && typeof videoConstraints === "object" && (
            ("facingMode" in videoConstraints && ((videoConstraints as any).facingMode === "environment" || (videoConstraints as any).facingMode?.ideal === "environment")) ||
            ("deviceId" in videoConstraints)
          )
        );
        watchForVideo(containerEl, { enforceNoMirror: preferEnv });
      }
    } catch (e: any) {
      // If constraints turned out to be overconstrained at render-time, retry looser ones once
      if (e?.name === "OverconstrainedError" || /overconstrained/i.test(e?.message ?? "")) {
        try {
          const retryConstraints: MediaTrackConstraints | boolean = { facingMode: "user" };
          scanner.clear().catch(() => {}).finally(async () => {
            const retryScanner = new Html5QrcodeScanner(
              readerElementIdRef.current,
              {
                fps: 10,
                qrbox: qrboxFunction,
                rememberLastUsedCamera: true,
                videoConstraints: retryConstraints,
                supportedScanTypes: [],
              },
              false
            );
            scannerRef.current = retryScanner;
            try {
              retryScanner.render(handleSuccess, handleError);
              return;
            } catch (e2: any) {
              onScanError(e2?.message ?? "Failed to start QR scanner (retry)");
            }
          });
          return;
        } catch {}
      }
      onScanError(e?.message ?? "Failed to start QR scanner");
    }
  };

  // Initialize only after mount, open, and layout (DOM timing safe)
  useEffect(() => {
    if (!isClient || !open) return;
    const el = containerRef.current;
    if (!el) return;
    if (startingRef.current || scannerRef.current) return;

    let ro: ResizeObserver | null = null;
    let cancelled = false;

    const maybeStart = async () => {
      if (cancelled) return;
      if (!open) return;
      const target = containerRef.current;
      if (!target) return;
      if (scannerRef.current || startingRef.current) return;
      if (target.clientWidth === 0 || target.clientHeight === 0) return;
      startingRef.current = true;
      try {
        // Give layout a moment to settle without deferring via setTimeout
        await nextFrame();
        await nextFrame();
        if (!open) return;
        if (!containerRef.current) return;
        await startScanner(containerRef.current);
      } finally {
        startingRef.current = false;
      }
    };

    // Try immediately
    maybeStart();

    // Observe size changes until we successfully start
    ro = new ResizeObserver(() => {
      if (!scannerRef.current) {
        maybeStart();
      } else if (ro) {
        // Once started, stop observing
        ro.disconnect();
        ro = null;
      }
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
    };
  }, [isClient, open]);

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
