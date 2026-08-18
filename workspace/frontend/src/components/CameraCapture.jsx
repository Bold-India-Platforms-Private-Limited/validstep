import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw } from "lucide-react";
import Button from "./ui/Button";

// Live front-camera view (not the OS file picker) with a shutter button. The captured
// frame gets a burned-in date/time watermark before it's handed back, so the photo alone
// is enough to prove when it was taken — matches physical attendance-register conventions.
export default function CameraCapture({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Camera access denied or unavailable. Check your browser permissions."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  function handleShutter() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const timestamp = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const padding = Math.round(canvas.width * 0.02);
    const fontSize = Math.max(12, Math.round(canvas.width * 0.035));
    ctx.font = `600 ${fontSize}px -apple-system, sans-serif`;
    const textWidth = ctx.measureText(timestamp).width;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - fontSize - padding * 2, textWidth + padding * 2, fontSize + padding * 1.5);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(timestamp, padding, canvas.height - fontSize / 2 - padding * 0.7);

    setPreview(canvas.toDataURL("image/jpeg", 0.85));
  }

  function handleConfirm() {
    onCapture(preview);
    setPreview(null);
  }

  function handleRetake() {
    setPreview(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4">
        <p className="text-white font-medium">Attendance selfie</p>
        <button
          onClick={() => {
            setPreview(null);
            onClose();
          }}
          className="p-2 rounded-full bg-white/10 text-white"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white/70 text-sm px-8 text-center">{error}</p>
        ) : preview ? (
          <img src={preview} alt="Captured" className="max-h-full max-w-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="max-h-full max-w-full object-contain -scale-x-100" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-6 flex items-center justify-center gap-4">
        {preview ? (
          <>
            <Button variant="secondary" onClick={handleRetake}>
              <RotateCcw size={16} /> Retake
            </Button>
            <Button onClick={handleConfirm}>Use this photo</Button>
          </>
        ) : (
          !error && (
            <button
              onClick={handleShutter}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/30 active:scale-95 transition flex items-center justify-center"
            >
              <Camera size={24} className="text-neutral-900" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
