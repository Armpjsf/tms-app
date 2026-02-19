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
  } catch (e) {
      console.warn("Brightness check failed", e)
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
        const img = new Image()
        img.src = URL.createObjectURL(file)
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            if (!ctx) return resolve(128)
            
            ctx.drawImage(img, 0, 0)
            
            // Sample center 100x100 pixels for speed
            const cx = Math.floor(img.width / 2)
            const cy = Math.floor(img.height / 2)
            const w = Math.min(100, img.width)
            const h = Math.min(100, img.height)
            
            const imageData = ctx.getImageData(cx - w/2, cy - h/2, w, h)
            const data = imageData.data
            let r,g,b,avg
            let colorSum = 0
            
            for(let x = 0, len = data.length; x < len; x+=4) {
                r = data[x]
                g = data[x+1]
                b = data[x+2]
                avg = Math.floor((r+g+b)/3)
                colorSum += avg
            }
            
            const brightness = Math.floor(colorSum / (w*h))
            resolve(brightness)
        }
        img.onerror = () => resolve(128)
    })
}
