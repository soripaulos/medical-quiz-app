"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void
}

export default function ImageUpload({ onImageSelect }: ImageUploadProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      onImageSelect(file)

      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    setPreviewUrl(null)
    onImageSelect(null)
  }

  return (
    <div className="space-y-4">
      {!selectedImage ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">Click to upload an image</p>
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="image-upload" />
          <label htmlFor="image-upload">
            <Button type="button" variant="outline" size="sm" asChild>
              <span>Choose File</span>
            </Button>
          </label>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{selectedImage.name}</span>
            <Button type="button" variant="outline" size="sm" onClick={removeImage}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {previewUrl && (
            <img
              src={previewUrl || "/placeholder.svg"}
              alt="Preview"
              className="max-w-full h-32 object-cover rounded-lg"
            />
          )}
        </div>
      )}
    </div>
  )
}
