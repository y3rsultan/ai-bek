export async function compressPhoto(buffer: ArrayBuffer): Promise<Buffer> {
  // Server-side: just pass through for now
  // Client-side compression happens before upload
  return Buffer.from(buffer);
}

// Client-side photo compression (used in browser)
export function compressPhotoClient(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    img.onload = () => {
      const maxWidth = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/jpeg",
        0.6
      );
    };

    img.src = URL.createObjectURL(file);
  });
}
