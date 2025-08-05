"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function YearsDebug() {
  const [yearsData, setYearsData] = useState<any>(null)
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testYearsAPI = async () => {
    setLoading(true)
    try {
      console.log("Testing years API...")
      const response = await fetch("/api/questions/years", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      const data = await response.json()
      console.log("Years API response:", data)
      setYearsData(data)
    } catch (error) {
      console.error("Years API error:", error)
      setYearsData({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  const testDebugAPI = async () => {
    setLoading(true)
    try {
      console.log("Testing debug years API...")
      const response = await fetch("/api/debug-years", {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      const data = await response.json()
      console.log("Debug API response:", data)
      setDebugData(data)
    } catch (error) {
      console.error("Debug API error:", error)
      setDebugData({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Years API Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={testYearsAPI} disabled={loading}>
              Test Years API
            </Button>
            <Button onClick={testDebugAPI} disabled={loading}>
              Test Debug API
            </Button>
          </div>

          {yearsData && (
            <div>
              <h3 className="font-semibold">Years API Response:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(yearsData, null, 2)}
              </pre>
            </div>
          )}

          {debugData && (
            <div>
              <h3 className="font-semibold">Debug API Response:</h3>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}