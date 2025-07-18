"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LabValuesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LabValuesModal({ open, onOpenChange }: LabValuesModalProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-center text-white bg-blue-600 -mx-6 -mt-6 px-6 py-4">Lab Values</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto">
          <Tabs defaultValue="blood" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="blood" className="text-xs">Blood</TabsTrigger>
              <TabsTrigger value="serum" className="text-xs">Serum</TabsTrigger>
              <TabsTrigger value="csf" className="text-xs">CSF</TabsTrigger>
              <TabsTrigger value="urine" className="text-xs">Urine</TabsTrigger>
            </TabsList>

            <TabsContent value="blood">
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Hematologic Reference</h3>
                <div className="bg-[#D7DCED] p-4 rounded-lg">
                  <iframe 
                    src="/Blood.html" 
                    className="w-full h-[60vh] border-0"
                    title="Blood Lab Values"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="serum">
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Serum Reference</h3>
                <div className="bg-[#D7DCED] p-4 rounded-lg">
                  <iframe 
                    src="/Serum.html" 
                    className="w-full h-[60vh] border-0"
                    title="Serum Lab Values"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="csf">
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Cerebrospinal Fluid Reference</h3>
                <div className="bg-[#D7DCED] p-4 rounded-lg">
                  <iframe 
                    src="/CSF.html" 
                    className="w-full h-[60vh] border-0"
                    title="CSF Lab Values"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="urine">
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-4 text-center">Urine Reference</h3>
                <div className="bg-[#D7DCED] p-4 rounded-lg">
                  <iframe 
                    src="/Urine.html" 
                    className="w-full h-[60vh] border-0"
                    title="Urine Lab Values"
                  />
                </div>
              </div>
            </TabsContent>
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
