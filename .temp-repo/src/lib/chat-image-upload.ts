import { storage } from "@/lib/firebase";

/**
 * "Uploads" an image by returning its compressed base64 data URL.
 * This bypasses Firebase Storage CORS issues by storing the image directly in the Firestore message.
 * The image is resized to 800x800 and compressed to keep the size well within Firestore's 1MB limit.
 */
export async function uploadChatImage(file: File): Promise<string | null> {
  console.log("[CHAT_UPLOAD] Processing image for base64 storage:", file.name);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.error("[CHAT_UPLOAD] Image processing timed out");
      resolve(null);
    }, 15000);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) {
        console.error("[CHAT_UPLOAD] FileReader result is empty");
        clearTimeout(timeout);
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error("[CHAT_UPLOAD] Failed to get canvas context");
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.6 quality to ensure small size
          const compressed = canvas.toDataURL('image/jpeg', 0.6);
          console.log("[CHAT_UPLOAD] Image processed successfully, size:", Math.round(compressed.length / 1024), "KB");
          resolve(compressed);
        } catch (err) {
          console.error("[CHAT_UPLOAD] Error during canvas processing:", err);
          resolve(null);
        }
      };
      img.onerror = (err) => {
        clearTimeout(timeout);
        console.error("[CHAT_UPLOAD] Failed to load image for resizing:", err);
        resolve(null);
      };
      img.src = result as string;
    };
    reader.onerror = (err) => {
      clearTimeout(timeout);
      console.error("[CHAT_UPLOAD] Failed to read file:", err);
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}

/** Image attachment tag format: [IMG_ATTACH:url] */
export function encodeImageAttachment(url: string, text?: string): string {
  const prefix = text?.trim() ? `${text.trim()} ` : "";
  return `${prefix}[IMG_ATTACH:${url}]`;
}

export function parseImageAttachment(message: string): { text: string; imageUrl: string | null } {
  const tag = "[IMG_ATTACH:";
  const idx = message.indexOf(tag);
  if (idx === -1) return { text: message, imageUrl: null };
  const urlStart = idx + tag.length;
  const urlEnd = message.indexOf("]", urlStart);
  if (urlEnd === -1) return { text: message, imageUrl: null };
  const imageUrl = message.substring(urlStart, urlEnd);
  const text = message.substring(0, idx).trim();
  return { text, imageUrl };
}
