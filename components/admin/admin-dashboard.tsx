"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Upload, BarChart3, Users, Settings } from "lucide-react"
import Link from "next/link"
import { FeedbackButton } from "@/components/feedback/feedback-button"

export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalUsers: 0,
    activeExams: 12, // This can be made dynamic later if needed
    questionsThisMonth: 45, // This can be made dynamic later if needed
  })
  const [recentActivity, setRecentActivity] = useState<
    { action: string; subject: string; time: string; type: string }[]
  >([])

  useEffect(() => {
    const fetchStatsAndActivity = async () => {
      try {
        const [questionsResponse, usersResponse, activityResponse] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/users"),
          fetch("/api/admin/activity"), // Fetch recent activity
        ])

        if (!questionsResponse.ok) {
          throw new Error(`HTTP error! status: ${questionsResponse.status} for questions stats`)
        }
        const questionsData = await questionsResponse.json()

        if (!usersResponse.ok) {
          throw new Error(`HTTP error! status: ${usersResponse.status} for users stats`)
        }
        const usersData = await usersResponse.json()

        if (!activityResponse.ok) {
          throw new Error(`HTTP error! status: ${activityResponse.status} for activity`)
        }
        const activityData = await activityResponse.json()

        setStats((prevStats) => ({
          ...prevStats,
          totalQuestions: questionsData.totalQuestions,
          totalUsers: usersData.totalUsers,
        }))
        setRecentActivity(activityData.activities)
      } catch (error) {
        console.error("Failed to fetch admin dashboard data:", error)
        // Optionally, handle error state in UI
      }
    }

    fetchStatsAndActivity()
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage questions, users, and exam content</p>
          </div>
          <div className="flex items-center gap-2">
            <FeedbackButton showText={true} size="sm" variant="outline" />
            <Link href="/">
              <Button variant="outline" size="sm">
                Back to Tests
              </Button>
            </Link>
            <Link href="/admin/questions/create">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create Question
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
              <p className="text-xs text-muted-foreground">+{stats.questionsThisMonth} this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeExams}</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">73%</div>
              <p className="text-xs text-muted-foreground">Average across all exams</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/admin/questions">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Question Management
                </CardTitle>
                <CardDescription>View, edit, and organize all questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Manage existing questions</span>
                  <Badge variant="secondary">{stats.totalQuestions}</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/admin/questions/create">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Question
                </CardTitle>
                <CardDescription>Add new questions manually</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Create individual questions</span>
                  <Badge variant="outline">Manual</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/admin/questions/upload">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Bulk Upload
                </CardTitle>
                <CardDescription>Upload questions via CSV file</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Import from CSV</span>
                  <Badge variant="outline">Bulk</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest changes to the question database</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === "create"
                            ? "bg-green-500"
                            : activity.type === "update"
                              ? "bg-blue-500"
                              : "bg-purple-500" // Fallback for other types like 'upload' if added later
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground truncate">{activity.subject}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{activity.time}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
