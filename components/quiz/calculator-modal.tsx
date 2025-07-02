"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface CalculatorModalProps {
  open: boolean
  onClose: () => void
}

export function CalculatorModal({ open, onClose }: CalculatorModalProps) {
  const [expression, setExpression] = useState("")
  const [display, setDisplay] = useState("0")
  const [isRadians, setIsRadians] = useState(true)

  const handleButtonClick = (value: string) => {
    if (display === "Error") {
      setDisplay("0")
      setExpression("")
    }

    switch (value) {
      case "=":
        try {
          // This is a simple and unsafe eval. For a real app, use a proper math parser library.
          // eslint-disable-next-line no-eval
          const result = eval(
            expression
              .replace(/%/g, "/100")
              .replace(/π/g, "Math.PI")
              .replace(/e/g, "Math.E")
              .replace(/√/g, "Math.sqrt")
              .replace(/sin/g, "Math.sin")
              .replace(/cos/g, "Math.cos")
              .replace(/tan/g, "Math.tan")
              .replace(/log/g, "Math.log10")
              .replace(/ln/g, "Math.log")
              .replace(/\^/g, "**")
          )
          const finalResult = Number(result.toFixed(10))
          setDisplay(finalResult.toString())
          setExpression(finalResult.toString())
        } catch (error) {
          setDisplay("Error")
          setExpression("")
        }
        break
      case "C":
        setExpression("")
        setDisplay("0")
        break
      case "Del":
        if (expression.length > 0) {
          const newExpression = expression.slice(0, -1)
          setExpression(newExpression)
          setDisplay(newExpression || "0")
        }
        break
      case "Rad":
      case "Deg":
        setIsRadians(!isRadians)
        break
      case "x²":
        setExpression((prev) => `(${prev})^2`)
        setDisplay((prev) => `(${prev})²`)
        break
      case "1/x":
        setExpression((prev) => `1/(${prev})`)
        setDisplay((prev) => `1/(${prev})`)
        break
      case "n!":
        try {
          const num = parseInt(expression)
          if (num < 0) {
            setDisplay("Error")
            setExpression("")
            return
          }
          let result = 1
          for (let i = 2; i <= num; i++) {
            result *= i
          }
          setDisplay(result.toString())
          setExpression(result.toString())
        } catch (error) {
          setDisplay("Error")
          setExpression("")
        }
        break
      default:
        // Check if the default case is a function (like 'sin', 'cos', etc.)
        const functions = ["sin", "cos", "tan", "log", "ln", "√"]
        if (functions.includes(value)) {
          setExpression((prev) => `${value}(${prev})`)
          setDisplay((prev) => `${value}(${prev})`)
        } else {
          // It's a number or operator
          if (expression === "0" && value !== ".") {
            setExpression(value)
            setDisplay(value)
          } else {
            setExpression((prev) => prev + value)
            setDisplay((prev) => (prev === "0" ? value : prev + value))
          }
        }
        break
    }
  }

  const buttons = [
    { label: isRadians ? "Rad" : "Deg", value: isRadians ? "Rad" : "Deg" },
    { label: "√", value: "√" },
    { label: "x²", value: "x²" },
    { label: "^", value: "^" },
    { label: "sin", value: "sin" },
    { label: "cos", value: "cos" },
    { label: "tan", value: "tan" },
    { label: "log", value: "log" },
    { label: "ln", value: "ln" },
    { label: "(", value: "(" },
    { label: ")", value: ")" },
    { label: "1/x", value: "1/x" },
    { label: "e", value: "e" },
    { label: "π", value: "π" },
    { label: "n!", value: "n!" },
    { label: "÷", value: "/" },
    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "×", value: "*" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "-", value: "-" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "+", value: "+" },
    { label: "0", value: "0" },
    { label: ".", value: "." },
    { label: "=", value: "=", className: "bg-primary" },
    { label: "Del", value: "Del" },
  ]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md p-2 bg-background border rounded-lg shadow-xl">
        <div className="flex justify-between items-center p-2 border-b">
          <h2 className="text-lg font-semibold">Calculator</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-muted text-muted-foreground rounded-md p-4 h-24 flex flex-col justify-end items-end">
            <div className="text-sm break-all opacity-70">{expression}</div>
            <div className="text-4xl font-mono break-all">{display}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {buttons.map(({ label, value, className }) => (
              <Button
                key={value}
                onClick={() => handleButtonClick(value)}
                className={`h-14 text-xl ${className || ""}`}
                variant={isNaN(Number(value)) && value !== "." ? "secondary" : "outline"}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1">
            <Button onClick={() => handleButtonClick("C")} className="h-14 text-xl" variant="destructive">
              Clear All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
