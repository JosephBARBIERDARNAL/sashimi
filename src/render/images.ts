/** Decoded image cache shared by the canvas renderer. */
const images = new Map<string, HTMLImageElement>();
let onImageLoad: (() => void) | null = null;
export const setImageLoadCallback = (cb: () => void) => (onImageLoad = cb);
export const getImage = (src: string) => {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.onload = () => onImageLoad?.();
    img.src = src;
    images.set(src, img);
  }
  return img;
};
