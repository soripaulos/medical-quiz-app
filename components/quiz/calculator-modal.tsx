"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CalculatorModal({ open, onOpenChange }: CalculatorModalProps) {
  const [input, setInput] = useState("0")
  const [operator, setOperator] = useState<string | null>(null)
  const [prevValue, setPrevValue] = useState<string | null>(null)

  const handleNumber = (num: string) => {
    if (input === "0" && num !== ".") {
      setInput(num)
    } else if (input.includes(".") && num === ".") {
      return
    } else {
      setInput(input + num)
    }
  }

  const handleOperator = (op: string) => {
    if (prevValue) {
      handleEquals()
    }
    setPrevValue(input)
    setInput("0")
    setOperator(op)
  }

  const handleEquals = () => {
    if (!operator || prevValue === null) return

    const current = parseFloat(input)
    const previous = parseFloat(prevValue)
    let result

    switch (operator) {
      case "+":
        result = previous + current
        break
      case "-":
        result = previous - current
        break
      case "×":
        result = previous * current
        break
      case "÷":
        result = previous / current
        break
      default:
        return
    }
    setInput(result.toString())
    setOperator(null)
    setPrevValue(null)
  }

  const handleClear = () => {
    setInput("0")
    setOperator(null)
    setPrevValue(null)
  }

  const handleFunction = (func: string) => {
    const value = parseFloat(input)
    let result

    switch (func) {
      case "sin":
        result = Math.sin((value * Math.PI) / 180) // Assuming degree input
        break
      case "cos":
        result = Math.cos((value * Math.PI) / 180) // Assuming degree input
        break
      case "tan":
        result = Math.tan((value * Math.PI) / 180) // Assuming degree input
        break
      case "log":
        result = Math.log10(value)
        break
      case "ln":
        result = Math.log(value)
        break
      case "√":
        result = Math.sqrt(value)
        break
      case "x²":
        result = Math.pow(value, 2)
        break
      case "%":
        result = value / 100
        break
      case "+/-":
        result = value * -1
        break
      default:
        return
    }
    setInput(result.toString())
  }

  const handleButtonClick = (btn: string) => {
    if (/[0-9.]/.test(btn)) {
      handleNumber(btn)
    } else if (["+", "-", "×", "÷"].includes(btn)) {
      handleOperator(btn)
    } else if (btn === "=") {
      handleEquals()
    } else if (btn === "C") {
      handleClear()
    } else if (btn === "DEL") {
      setInput(input.slice(0, -1) || "0")
    } else {
      handleFunction(btn)
    }
  }

  const buttons = [
    "sin", "cos", "tan", "log", "C",
    "ln", "√", "x²", "%", "DEL",
    "7", "8", "9", "÷", "+/-",
    "4", "5", "6", "×", "(",
    "1", "2", "3", "-", ")",
    "0", ".", "=", "+",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 border-0">
        <div className="bg-background rounded-lg shadow-lg">
          <div className="p-4">
            <div className="bg-muted text-muted-foreground rounded-md p-4 h-20 flex flex-col justify-end items-end mb-4">
              <div className="text-3xl font-mono break-all text-right w-full">
                {operator && prevValue ? `${prevValue} ${operator}` : ''}
              </div>
              <div className="text-5xl font-mono break-all text-right w-full">{input}</div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {buttons.map((btn) => {
                const isOperator = ["÷", "×", "-", "+", "="].includes(btn)
                const isFn = ["sin", "cos", "tan", "log", "ln", "√", "x²", "%", "+/-"].includes(btn)
                const isClear = ["C", "DEL"].includes(btn)
                
                let className = ""
                if (isOperator) className = "bg-primary text-primary-foreground hover:bg-primary/90"
                if (isClear) className = "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                if (isFn) className = "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                if (btn === "0") className += " col-span-2"


                return (
                  <Button
                    key={btn}
                    onClick={() => handleButtonClick(btn)}
                    className={`h-14 text-xl ${className}`}
                    variant={isOperator || isClear || isFn ? "default" : "outline"}
                  >
                    {btn}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
