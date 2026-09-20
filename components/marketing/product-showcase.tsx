"use client"

import { useEffect, useState } from "react"
import { BarChart3, Check, Clock3, Filter, Flag, FlaskConical, RotateCcw, Target } from "lucide-react"

const tabs = ["Build a test", "Practice", "Track progress"] as const

export function ProductShowcase() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % tabs.length), 5200)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_28px_80px_-34px_rgba(15,23,42,.38)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs text-white">M</span>
          Study workspace
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Session ready</span>
      </div>
      <div className="grid grid-cols-3 bg-slate-100 p-1.5">
        {tabs.map((tab, index) => (
          <button key={tab} onClick={() => setActive(index)} className={`rounded-lg px-2 py-2.5 text-xs font-semibold transition-all sm:text-sm ${active === index ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
            {tab}
          </button>
        ))}
      </div>
      <div key={active} className="mp-demo-enter min-h-[410px] p-4 sm:p-6">
        {active === 0 && <BuildDemo />}
        {active === 1 && <PracticeDemo />}
        {active === 2 && <ProgressDemo />}
      </div>
    </div>
  )
}

function BuildDemo() {
  const groups = [
    ["Specialties", ["Internal Medicine", "Pediatrics", "Surgery"]],
    ["Exam type", ["COC", "Exit Exam", "Mock"]],
    ["Question status", ["Unanswered", "Incorrect", "Flagged"]],
  ]
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div><p className="flex items-center gap-2 text-sm font-bold text-slate-800"><Filter className="h-4 w-4 text-blue-600" /> Question Filters</p><p className="mt-1 text-xs text-slate-500">2,600+ questions available</p></div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">All years</span>
      </div>
      <div className="space-y-4">
        {groups.map(([label, options], groupIndex) => (
          <div key={label as string} className="border-b border-slate-100 pb-4 last:border-0">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600"><span>{label as string}</span><span className="text-blue-600">Select all</span></div>
            <div className="flex flex-wrap gap-2">{(options as string[]).map((option, index) => <span key={option} className={`rounded-md border px-2.5 py-1.5 text-xs transition ${index === groupIndex % 3 ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>{index === groupIndex % 3 && <Check className="mr-1 inline h-3 w-3" />}{option}</span>)}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs"><span className="flex items-center gap-2 font-medium text-slate-700"><RotateCcw className="h-4 w-4 text-blue-600" /> Randomize question order</span><span className="h-5 w-9 rounded-full bg-blue-600 p-0.5"><span className="block h-4 w-4 translate-x-4 rounded-full bg-white" /></span></div>
    </div>
  )
}

function PracticeDemo() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs font-semibold text-slate-500"><span>Item <b className="text-slate-800">6 of 16</b></span><div className="flex gap-3"><Flag className="h-4 w-4 text-amber-500" /><FlaskConical className="h-4 w-4" /><Clock3 className="h-4 w-4 text-blue-600" /></div></div>
      <div className="rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700 shadow-sm"><div className="mb-3 flex gap-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">Year 2025</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">Exit Exam</span></div>A 21-year-old presents with periumbilical pain that has migrated to the right lower quadrant. What is the most likely diagnosis?</div>
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center gap-3 rounded-lg border-2 border-emerald-400 bg-emerald-50 p-3 text-emerald-800"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 font-bold">A</span> Acute appendicitis <Check className="ml-auto h-4 w-4" /></div>
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-red-200 font-bold">B</span> Diverticulitis</div>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-slate-600"><span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 font-bold">C</span> Acute gastroenteritis</div>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold text-slate-700">Explanation</p><p className="mt-1 text-xs leading-5 text-slate-500">Migratory periumbilical pain localizing to the right lower quadrant is characteristic of appendicitis.</p></div>
    </div>
  )
}

function ProgressDemo() {
  const bars = [["Internal Medicine", 82], ["Public Health", 74], ["Pediatrics", 68], ["Surgery", 55]] as const
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {[["Overall score", "74%"], ["Attempted", "286"], ["Sessions", "33"]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xl font-bold text-slate-800">{value}</p></div>)}
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="mb-4 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold text-slate-800"><BarChart3 className="h-4 w-4 text-blue-600" /> Performance by category</p><span className="text-[11px] text-slate-400">Last 33 sessions</span></div>
        <div className="space-y-3">{bars.map(([name, value], index) => <div key={name}><div className="mb-1 flex justify-between text-xs text-slate-600"><span>{name}</span><b>{value}%</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="mp-progress-bar h-full rounded-full bg-blue-500" style={{ width: `${value}%`, animationDelay: `${index * 130}ms` }} /></div></div>)}</div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Target className="h-5 w-5 text-blue-600" /><span><b className="block text-slate-800">See the pattern, not only the score</b>Review history, notes, accuracy and question coverage together.</span></div>
    </div>
  )
}
