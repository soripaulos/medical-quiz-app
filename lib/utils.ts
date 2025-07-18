import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to parse sources text and extract URLs
export function parseSources(sources: string): Array<{ text: string; url?: string }> {
  if (!sources) return []

  // Split sources by common delimiters (newlines, semicolons, etc.)
  return sources
    .split(/[\n;]/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(source => {
      // Check if the source contains a URL
      const urlMatch = source.match(/(https?:\/\/[^\s]+)/i)
      
      if (urlMatch) {
        const url = urlMatch[1]
        const displayText = source.replace(url, '').trim() || url
        return { text: displayText, url }
      } else {
        return { text: source }
      }
    })
}
