export interface AIAnalysisResult {
  isValid: boolean
  score: number // 0-100
  issues: string[]
  confidence: number
}

export async function analyzePODImage(file: File): Promise<AIAnalysisResult> {
  // Simulate AI Processing Delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  const issues: string[] = []
  let score = 100

  // 1. File Size Check (Too small = likely blurry/icon)
  if (file.size < 50 * 1024) { // < 50KB
    score -= 40
    issues.push("รูปภาพมีขนาดเล็กเกินไป (ภาพอาจไม่ชัด)")
  }

  // 2. Image Ratio Check (Optional - e.g., extremely wide/tall)
  
  // 3. Mock Content Analysis (Randomized for demo purposes if "good" size)
  // In real world, we'd send to Vercel AI SDK / OpenAI / Azure Vision
  // For demo: randomly flag issues if score is still high, just to show UI
  
  // Let's implement a real basic client-side check: brightness
  try {
      const brightness = await getImageBrightness(file)
      if (brightness < 40) {
          score -= 30
          issues.push("รูปภาพมืดเกินไป")
      } else if (brightness > 220) {
          score -= 20
          issues.push("รูปภาพสว่างเกินไป")
      }
  } catch {
      // Brightness check failed
  }

  // Final Decision
  const isValid = score > 60

  return {
    isValid,
    score,
    issues,
    confidence: 0.95
  }
}

function getImageBrightness(file: File): Promise<number> {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            try {
                // Draw into a TINY canvas. A full-resolution canvas of a 12MP
                // phone photo allocates ~48MB and, run per photo, blows the iOS
                // Safari per-tab memory limit and crashes the page. A small
                // downscaled sample is plenty to gauge brightness.
                const MAX = 64
                const scale = Math.min(1, MAX / Math.max(img.width, img.height))
                const cw = Math.max(1, Math.round(img.width * scale))
                const ch = Math.max(1, Math.round(img.height * scale))

                const canvas = document.createElement('canvas')
                canvas.width = cw
                canvas.height = ch
                const ctx = canvas.getContext('2d')
                if (!ctx) { resolve(128); return }

                ctx.drawImage(img, 0, 0, cw, ch)
                const data = ctx.getImageData(0, 0, cw, ch).data

                let colorSum = 0
                for (let i = 0, len = data.length; i < len; i += 4) {
                    colorSum += (data[i] + data[i + 1] + data[i + 2]) / 3
                }
                resolve(Math.floor(colorSum / (cw * ch)))
            } catch {
                resolve(128)
            } finally {
                URL.revokeObjectURL(url)
            }
        }
        img.onerror = () => { URL.revokeObjectURL(url); resolve(128) }
        img.src = url
    })
}
