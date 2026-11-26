/**
 * Reads an image file and returns it as a downscaled JPEG data URL.
 * Phone photos are several MB; 800 px keeps the payload small while staying sharp enough for thumbnails.
 */
export const compressImage = (file: File, maxDim = 800, quality = 0.82): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Cannot read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Cannot decode image'));
      img.onload = () => {
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
