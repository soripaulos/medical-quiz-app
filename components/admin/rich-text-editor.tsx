"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Bold, Italic, LinkIcon, ImageIcon } from "lucide-react"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("")

  const insertText = (before: string, after = "") => {
    const textarea = document.activeElement as HTMLTextAreaElement
    if (textarea && textarea.tagName === "TEXTAREA") {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)
      const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end)
      onChange(newContent)
    }
  }

  const insertLink = () => {
    if (linkUrl && linkText) {
      const linkMarkdown = `[${linkText}](${linkUrl})`
      const newContent = content + linkMarkdown
      onChange(newContent)
      setLinkUrl("")
      setLinkText("")
      setShowLinkDialog(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border rounded-t-lg bg-gray-50">
        <Button type="button" variant="ghost" size="sm" onClick={() => insertText("**", "**")} title="Bold">
          <Bold className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => insertText("*", "*")} title="Italic">
          <Italic className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowLinkDialog(true)} title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertText("![Image](", ")")}
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] rounded-t-none"
      />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Link Text</label>
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter link text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="https://example.com"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={insertLink}>
              Insert Link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">Supports Markdown: **bold**, *italic*, [link](url), ![image](url)</p>
    </div>
  )
}
