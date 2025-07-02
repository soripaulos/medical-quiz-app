"use client"

import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CalculatorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CalculatorModal({ open, onOpenChange }: CalculatorModalProps) {
  const [display, setDisplay] = useState("0")
  const [operation, setOperation] = useState<string | null>(null)
  const [previousValue, setPreviousValue] = useState<string | null>(null)
  const [isNewOperand, setIsNewOperand] = useState(true)

  const handleNumberClick = (num: string) => {
    if (isNewOperand || display === "0") {
      setDisplay(num)
      setIsNewOperand(false)
    } else {
      setDisplay(display + num)
    }
  }

  const handleOperatorClick = (op: string) => {
    if (previousValue && operation && !isNewOperand) {
      calculate()
      setOperation(op)
    } else {
      setPreviousValue(display)
      setOperation(op)
      setIsNewOperand(true)
    }
  }

  const handleEqualsClick = () => {
    if (!previousValue || !operation) return
    calculate()
    setPreviousValue(null)
    setOperation(null)
  }

  const calculate = () => {
    if (!operation || previousValue === null) return
    const prev = parseFloat(previousValue)
    const current = parseFloat(display)
    let result = 0

    switch (operation) {
      case "+":
        result = prev + current
        break
      case "-":
        result = prev - current
        break
      case "×":
        result = prev * current
        break
      case "÷":
        result = prev / current
        break
      default:
        return
    }
    setDisplay(String(result))
    setIsNewOperand(true)
  }

  const handleClearClick = () => {
    setDisplay("0")
    setPreviousValue(null)
    setOperation(null)
    setIsNewOperand(true)
  }

  const handleToggleSign = () => {
    setDisplay((prev) => String(parseFloat(prev) * -1))
  }

  const handlePercent = () => {
    setDisplay((prev) => String(parseFloat(prev) / 100))
  }

  const handleScientific = (func: string) => {
    const value = parseFloat(display)
    let result = 0
    switch (func) {
      case "√":
        result = Math.sqrt(value)
        break
      case "x²":
        result = value * value
        break
      case "sin":
        result = Math.sin((value * Math.PI) / 180) // degree to radian
        break
      case "cos":
        result = Math.cos((value * Math.PI) / 180)
        break
      case "tan":
        result = Math.tan((value * Math.PI) / 180)
        break
      case "log":
        result = Math.log10(value)
        break
      default:
        return
    }
    setDisplay(String(result))
    setIsNewOperand(true)
  }

  const handleButtonClick = (btn: string) => {
    if (!isNaN(Number(btn)) || btn === ".") {
      handleNumberClick(btn)
    } else if (["+", "-", "×", "÷"].includes(btn)) {
      handleOperatorClick(btn)
    } else if (btn === "=") {
      handleEqualsClick()
    } else if (btn === "AC") {
      handleClearClick()
    } else if (btn === "±") {
      handleToggleSign()
    } else if (btn === "%") {
      handlePercent()
    } else {
      handleScientific(btn)
    }
  }

  const buttons = [
    "AC", "±", "%", "÷",
    "sin", "7", "8", "9", "×",
    "cos", "4", "5", "6", "-",
    "tan", "1", "2", "3", "+",
    "log", "√", "x²", "0", ".",
    "=",
  ]

  const getButtonClass = (btn: string) => {
    if (["÷", "×", "-", "+", "="].includes(btn)) {
      return "bg-primary text-primary-foreground hover:bg-primary/90"
    }
    if (["AC", "±", "%", "sin", "cos", "tan", "log", "√", "x²"].includes(btn)) {
      return "bg-muted hover:bg-muted/80"
    }
    return "bg-secondary hover:bg-secondary/80"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 border-0">
        <div className="p-4 space-y-4">
          <div className="bg-muted text-muted-foreground rounded-md p-4 h-24 flex flex-col justify-end items-end">
            <div className="text-4xl font-mono break-all">{display}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {buttons.slice(0, 4).map((btn) => (
              <Button key={btn} onClick={() => handleButtonClick(btn)} className={`h-16 text-xl ${getButtonClass(btn)}`}>{btn}</Button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2">
             {buttons.slice(4, 21).map((btn, index) => (
                <Button key={btn} onClick={() => handleButtonClick(btn)} className={`h-16 text-xl ${index % 5 === 4 ? getButtonClass(btn) : getButtonClass(btn)} ${btn === '0' ? 'col-span-2' : ''}`}>
                    {btn}
                </Button>
            ))}
            <Button onClick={() => handleButtonClick("=")} className={`h-16 text-xl col-span-2 ${getButtonClass("=")}`}>=</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
