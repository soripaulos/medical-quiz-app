import { Loader2 } from "lucide-react"

export const LoadingSpinner = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => (
  <div className="flex items-center justify-center">
    <Loader2
      className={`animate-spin ${
        size === "sm" ? "h-4 w-4" : size === "md" ? "h-8 w-8" : "h-12 w-12"
      }`}
    />
  </div>
)

export const FullPageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  </div>
)
