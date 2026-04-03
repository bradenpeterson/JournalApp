import sharp from 'sharp'

/**
 * Normalize any common raster (JPEG, PNG, WebP, GIF, …) into a JPEG buffer for pdfkit.
 * Keeps memory bounded via resize; returns null if Sharp cannot decode the input.
 */
export async function rasterizeForPdfEmbedding(input: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(input, { failOn: 'none' })
      .rotate()
      .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer()
  } catch {
    return null
  }
}
