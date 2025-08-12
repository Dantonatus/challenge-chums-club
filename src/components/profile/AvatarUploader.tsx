import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud } from "lucide-react";

interface AvatarUploaderProps {
  userId: string;
  onUploaded: (signedUrl: string) => void | Promise<void>;
  label?: string;
}

// Utility: resize and center-crop to 512x512 and convert to JPEG ~ quality 0.8
async function resizeToSquareJPEG(file: File, size = 512, quality = 0.8): Promise<Blob> {
  const img = document.createElement("img");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  img.src = dataUrl;
  await new Promise((res, rej) => {
    img.onload = () => res(null);
    img.onerror = rej;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = size;
  canvas.height = size;

  // Compute cover crop
  const { width: iw, height: ih } = img;
  const scale = Math.max(size / iw, size / ih);
  const sw = size / scale;
  const sh = size / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;

  // Fill background (use white to avoid black for transparent PNG)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", quality));
  return blob;
}

export const AvatarUploader = ({ userId, onUploaded, label = "Neues Bild hochladen" }: AvatarUploaderProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || !fileList[0]) return;
    const file = fileList[0];

    if (!/(png|jpg|jpeg|webp)$/i.test(file.type)) {
      toast({ title: "Ungültiger Dateityp", description: "Bitte PNG, JPG oder WebP auswählen.", variant: "destructive" as any });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Datei zu groß", description: "Maximal 4 MB.", variant: "destructive" as any });
      return;
    }

    try {
      setProcessing(true);
      setProgress(10);

      // Show temporary preview
      setPreview(URL.createObjectURL(file));

      // Resize/compress
      const resized = await resizeToSquareJPEG(file, 512, 0.8);
      setProgress(60);

      // Upload
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, resized, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (upErr) throw upErr;
      setProgress(80);

      // Signed URL for 7 days
      const { data: signed, error: signErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Konnte URL nicht erstellen");
      setProgress(100);

      await onUploaded(signed.signedUrl);
      toast({ title: "Avatar aktualisiert" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Upload fehlgeschlagen", description: e?.message ?? String(e), variant: "destructive" as any });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [onUploaded, toast, userId]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onBrowseClick = () => fileInputRef.current?.click();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <UploadCloud className="h-4 w-4 mr-2" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neues Bild hochladen</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={onDrop}
          className="border-2 border-dashed rounded-xl p-6 text-center select-none"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="h-6 w-6 opacity-70" />
            <p className="text-sm text-muted-foreground">PNG, JPG oder WebP — bis 4 MB</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onBrowseClick}>Datei auswählen</Button>
              <Button size="sm" variant="secondary" onClick={() => window.open(window.location.href, "_blank")}>In neuem Tab öffnen</Button>
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-4 flex items-center gap-4">
            <img src={preview} alt="Vorschau" className="h-16 w-16 rounded-lg object-cover" />
            <p className="text-sm text-muted-foreground">Vorschau (endgültiges Bild wird quadratisch komprimiert)</p>
          </div>
        )}

        {processing && (
          <div className="mt-4">
            <Progress value={progress} />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
