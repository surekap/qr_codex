export async function shareImage(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'QR Codex barcode' });
          resolve();
        } catch (e) {
          if ((e as DOMException).name !== 'AbortError') reject(e);
          else resolve();
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }
    }, 'image/png');
  });
}
