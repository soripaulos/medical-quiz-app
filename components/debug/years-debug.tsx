"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function YearsDebug() {
  const [apiResponse, setApiResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testYearsAPI = async () => {
    setLoading(true)
    setError(null)
    setApiResponse(null)

    try {
      console.log("Testing /api/questions/years...")
      const response = await fetch("/api/questions/years")
      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))
      
      const text = await response.text()
      console.log("Raw response text:", text)
      
      let data
      try {
        data = JSON.parse(text)
        console.log("Parsed JSON:", data)
      } catch (parseError) {
        console.error("JSON parse error:", parseError)
        setError(`JSON parse error: ${parseError}`)
        return
      }

      if (!response.ok) {
        setError(`HTTP ${response.status}: ${data?.message || text}`)
        return
      }

      setApiResponse(data)
    } catch (err) {
      console.error("Fetch error:", err)
      setError(`Fetch error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testYearsAPI()
  }, [])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Years API Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={testYearsAPI} disabled={loading}>
          {loading ? "Testing..." : "Test Years API"}
        </Button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {apiResponse && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <h3 className="font-semibold text-green-800">API Response:</h3>
              <pre className="text-sm text-green-700 whitespace-pre-wrap">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>

            {apiResponse.years && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-semibold text-blue-800">Years Found ({apiResponse.years.length}):</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {apiResponse.years.map((year: number) => (
                    <span key={year} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {year}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}