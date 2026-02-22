"use client"

/**
 * Compresses an image file using HTML5 Canvas.
 * @param file The original image file
 * @param maxWidth Maximum width of the compressed image
 * @param maxHeight Maximum height of the compressed image
 * @param quality Compression quality (0 to 1)
 * @returns A promise that resolves to the compressed Blob
 */
export async function compressImage(
    file: File, 
    maxWidth: number = 1280, 
    maxHeight: number = 1280, 
    quality: number = 0.7
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = (event) => {
            const img = new Image()
            img.src = event.target?.result as string
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width
                        width = maxWidth
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height
                        height = maxHeight
                    }
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error("Failed to get 2D context"))
                    return
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height)

                // Export as blob
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error("Failed to create blob"))
                        }
                    },
                    'image/jpeg',
                    quality
                )
            }
            img.onerror = (err) => reject(err)
        }
        reader.onerror = (err) => reject(err)
    })
}
