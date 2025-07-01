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
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === "0" ? num : display + num)
    }
  }

  const inputOperation = (nextOperation: string) => {
    const inputValue = Number.parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(newValue)
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case "+":
        return firstValue + secondValue
      case "-":
        return firstValue - secondValue
      case "×":
        return firstValue * secondValue
      case "÷":
        return firstValue / secondValue
      case "=":
        return secondValue
      default:
        return secondValue
    }
  }

  const performCalculation = () => {
    const inputValue = Number.parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
    }
  }

  const clear = () => {
    setDisplay("0")
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(false)
  }

  const buttons = [
    ["Del", "M+", "MR", "Rnd", "C"],
    ["1/x", "log10", "ln", "e", "%"],
    ["sin", "cos", "tan", "π", "√"],
    ["n!", "Mod", "x^y", "∛√", "("],
    ["7", "8", "9", "+", "-/+"],
    ["4", "5", "6", "-", "√"],
    ["1", "2", "3", "/", "x³"],
    [".", "0", "=", "X", "x²"],
  ]

  const handleButtonClick = (btn: string) => {
    switch (btn) {
      case "C":
        clear()
        break
      case "=":
        performCalculation()
        break
      case "+":
      case "-":
      case "×":
      case "÷":
        inputOperation(btn)
        break
      case ".":
        if (display.indexOf(".") === -1) {
          inputNumber(".")
        }
        break
      default:
        if (/\d/.test(btn)) {
          inputNumber(btn)
        }
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-900 text-white border-0">
        <div className="space-y-4">
          {/* Display */}
          <div className="bg-black p-4 rounded text-right text-2xl font-mono">{display}</div>

          {/* Buttons */}
          <div className="grid grid-cols-5 gap-1">
            {buttons.flat().map((btn, index) => (
              <Button
                key={index}
                variant="outline"
                className={`h-12 text-sm font-medium ${
                  /\d|\./.test(btn)
                    ? "bg-gray-600 hover:bg-gray-500 text-white border-gray-500"
                    : "bg-blue-600 hover:bg-blue-500 text-white border-blue-500"
                }`}
                onClick={() => handleButtonClick(btn)}
              >
                {btn}
              </Button>
            ))}
          </div>

          {/* Close button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-600 hover:bg-gray-500 text-white border-gray-500"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
