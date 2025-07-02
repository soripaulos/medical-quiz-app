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
      <DialogContent className="max-w-xs p-0 border-0">
        <div className="p-6">
          <div className="bg-muted text-muted-foreground rounded-md p-4 h-24 flex flex-col justify-end items-end mb-4">
            <div className="text-4xl font-mono break-all">{display}</div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {buttons.flat().map((btn) => {
              const isOperator = ["/", "×", "-", "+"].includes(btn)
              const isEquals = btn === "="
              const isClear = btn === "C"
              const isZero = btn === "0"

              return (
                <Button
                  key={btn}
                  onClick={() => handleButtonClick(btn)}
                  className={`h-16 text-2xl ${isZero ? "col-span-2" : ""} ${
                    isOperator || isEquals ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                  } ${isClear ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}`}
                  variant={isOperator || isEquals || isClear ? "default" : "secondary"}
                >
                  {btn}
                </Button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
