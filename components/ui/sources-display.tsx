import { parseSources } from "@/lib/utils"

interface SourcesDisplayProps {
  sources: string
  className?: string
}

export function SourcesDisplay({ sources, className = "" }: SourcesDisplayProps) {
  if (!sources) return null

  const sourceItems = parseSources(sources)

  return (
    <div className={`space-y-1 ${className}`}>
      {sourceItems.map((source, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">•</span>
          {source.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline hover:no-underline transition-colors"
            >
              {source.text}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">{source.text}</span>
          )}
        </div>
      ))}
    </div>
  )
} 