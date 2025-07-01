"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import type { LabValue } from "@/lib/types"

interface LabValuesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LabValuesModal({ open, onOpenChange }: LabValuesModalProps) {
  const [labValues, setLabValues] = useState<LabValue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchLabValues()
    }
  }, [open])

  const fetchLabValues = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("lab_values")
        .select("*")
        .order("category", { ascending: true })
        .order("test_name", { ascending: true })

      if (error) throw error
      setLabValues(data || [])
    } catch (error) {
      console.error("Error fetching lab values:", error)
    } finally {
      setLoading(false)
    }
  }

  const categories = [...new Set(labValues.map((lv) => lv.category))]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-white bg-blue-600 -mx-6 -mt-6 px-6 py-4">Lab Values</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto">
          <Tabs defaultValue={categories[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category} value={category}>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-4 text-center">{category}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-100">
                        <TableHead className="font-semibold">Test</TableHead>
                        <TableHead className="font-semibold">Reference Range</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labValues
                        .filter((lv) => lv.category === category)
                        .map((labValue) => (
                          <TableRow key={labValue.id}>
                            <TableCell className="font-medium">{labValue.test_name}</TableCell>
                            <TableCell>
                              {labValue.reference_range}
                              {labValue.units && ` ${labValue.units}`}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            X
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
