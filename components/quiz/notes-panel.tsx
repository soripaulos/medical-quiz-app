"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Save } from "lucide-react"

interface NotesPanelProps {
  questionId: string
  noteText: string
  onNoteChange: (note: string) => void
  onSaveNote: (note: string) => void
  isDarkMode?: boolean
}

export function NotesPanel({ questionId, noteText, onNoteChange, onSaveNote, isDarkMode = false }: NotesPanelProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSaveNote(noteText)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <h3 className={`font-semibold text-lg ${isDarkMode ? "text-white" : ""}`}>Notes</h3>

      <Textarea
        placeholder="Add your notes for this question..."
        value={noteText}
        onChange={(e) => onNoteChange(e.target.value)}
        className={`min-h-[200px] resize-none ${
          isDarkMode ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" : ""
        }`}
      />

      <Button onClick={handleSave} disabled={isSaving || !noteText.trim()} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save Note"}
      </Button>
    </div>
  )
}
