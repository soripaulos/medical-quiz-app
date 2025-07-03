"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Clock, Target, Zap } from "lucide-react"
import { UserSession } from "@/lib/types"

interface ActiveSessionCardProps {
  session: UserSession
}

export function ActiveSessionCard({ session }: ActiveSessionCardProps) {
  const progress = session.total_questions > 0
    ? ((session.current_question_index) / session.total_questions) * 100
    : 0

  return (
    <Card className="mb-8 border-primary/20 bg-primary/5 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-primary mb-1">You have an active session</p>
            <CardTitle className="text-2xl">{session.session_name}</CardTitle>
          </div>
          <Link href={`/test/${session.id}`} legacyBehavior>
            <Button size="lg" className="flex-shrink-0">
              <Zap className="w-4 h-4 mr-2" />
              Resume Session
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-medium text-muted-foreground">Progress</p>
              <p className="text-sm font-bold">{session.current_question_index} / {session.total_questions} Questions</p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span>Mode: <span className="font-semibold capitalize">{session.session_type}</span></span>
            </div>
            {session.time_limit && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Time Limit: <span className="font-semibold">{session.time_limit} minutes</span></span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 