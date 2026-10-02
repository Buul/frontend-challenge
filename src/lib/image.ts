/**
 * Crops the image to a centered square and scales it to `size` px, as a JPEG `data:` URL.
 * Keeps uploads small (about 20 kB) whatever the original resolution.
 */
export async function toSquareDataUrl(file: Blob, size = 256) {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível.')
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    bitmap.close()
  }
}
