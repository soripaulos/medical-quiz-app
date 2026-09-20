import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Calculator,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Flag,
  FlaskConical,
  History,
  MessageSquare,
  NotebookPen,
  Play,
  RotateCcw,
  Stethoscope,
  Target,
  Trophy,
} from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"
import { ProductShowcase } from "@/components/marketing/product-showcase"
import { Reveal } from "@/components/marketing/reveal"

const workflow = [
  ["01", "Choose your focus", "Filter by specialty, exam, year, difficulty and your previous answer status.", Filter],
  ["02", "Set the conditions", "Choose practice or exam mode, set the length and decide whether progress is tracked.", Clock3],
  ["03", "Work the questions", "Answer, flag, take notes and open clinical reference tools without leaving the test.", BookOpenCheck],
  ["04", "Review and adjust", "Study your results, category performance and history before building the next session.", BarChart3],
] as const

const tools = [
  [Calculator, "Calculator", "Handle clinical calculations without breaking concentration."],
  [FlaskConical, "Lab values", "Open blood, serum, urine and CSF reference ranges in-session."],
  [NotebookPen, "Personal notes", "Save a note against a question and revisit it from your progress dashboard."],
  [Flag, "Flags", "Mark uncertain or important questions and filter for them later."],
  [MessageSquare, "Question feedback", "Report an issue from the exact question where you found it."],
  [FileText, "Explanations and sources", "Review the reasoning and supporting references after answering."],
] as const

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" aria-label="MedPrep ET home"><AppLogo /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Main navigation">
            <a className="transition-colors hover:text-blue-600" href="#workflow">How it works</a>
            <a className="transition-colors hover:text-blue-600" href="#features">Features</a>
            <a className="transition-colors hover:text-blue-600" href="#analytics">Progress</a>
          </nav>
          <Link href="/login" className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative border-b border-slate-200 bg-white">
        <div className="pointer-events-none absolute inset-0 mp-grid-pattern opacity-45" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:px-10 lg:py-24">
          <div className="mp-hero-copy">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              <Stethoscope className="h-3.5 w-3.5" /> Built for medical exam preparation in Ethiopia
            </div>
            <h1 className="max-w-2xl text-5xl font-bold leading-[1.04] tracking-[-0.045em] text-slate-900 sm:text-6xl lg:text-[4.35rem]">
              Prepare with questions that lead somewhere.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              Build focused tests, practise with immediate explanations, simulate timed exams and turn every session into a clearer study plan.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg">
                Start studying <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 font-semibold text-slate-700 transition-all hover:border-blue-300 hover:text-blue-700">
                See what is inside
              </a>
            </div>
            <div className="mt-9 grid max-w-xl grid-cols-2 gap-x-5 gap-y-3 border-t border-slate-200 pt-6 text-sm text-slate-600">
              {["Practice and timed exam modes", "2,600+ question bank", "Detailed explanations", "Progress and note history"].map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />{item}</span>)}
            </div>
          </div>
          <div className="mp-hero-demo relative">
            <div className="absolute -left-6 top-10 hidden h-24 w-2 rounded-full bg-blue-500 lg:block" />
            <ProductShowcase />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-200 border-x border-slate-200 sm:grid-cols-4 sm:divide-y-0">
          {[["2,600+", "Questions available"], ["6", "Specialty groups"], ["4", "Exam formats"], ["1", "Continuous study record"]].map(([value, label]) => (
            <div key={label} className="px-5 py-7 text-center"><strong className="block text-2xl font-bold text-slate-900 sm:text-3xl">{value}</strong><span className="mt-1 block text-xs font-medium text-slate-500 sm:text-sm">{label}</span></div>
          ))}
        </div>
      </section>

      <section id="workflow" className="bg-white py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">A complete study loop</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">From choosing a topic to knowing what comes next.</h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">MedPrep ET keeps test creation, focused practice and performance review in one connected workflow.</p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map(([number, title, copy, Icon], index) => (
              <Reveal key={number} delay={index * 90}>
                <article className="group h-full rounded-xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/50">
                  <div className="flex items-center justify-between"><span className="text-xs font-bold tracking-widest text-blue-600">{number}</span><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white"><Icon className="h-5 w-5" /></span></div>
                  <h3 className="mt-8 text-xl font-bold text-slate-900">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-200 bg-slate-50 py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Create the right test</p><h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">The question bank adapts to today&apos;s objective.</h2></div>
            <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">Start broad or narrow the bank using exactly the filters already available in the app. Revisit unanswered, incorrect or flagged questions when revision becomes more targeted.</p>
          </Reveal>

          <div className="mt-12 grid gap-7 lg:grid-cols-[1.08fr_.92fr]">
            <Reveal>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between bg-blue-500 px-5 py-4 text-white"><span className="flex items-center gap-2 font-bold"><Filter className="h-5 w-5" /> Question Filters</span><span className="rounded-full border border-white/40 px-3 py-1 text-xs">2,663 questions</span></div>
                <div className="grid gap-0 sm:grid-cols-2">
                  {[["Specialties", "Internal Medicine", "OB/GYN", "Pediatrics", "Surgery"], ["Years", "2025", "2024", "2023", "2022"], ["Question status", "Unanswered", "Correct", "Incorrect", "Flagged"], ["Exam types", "COC", "COC-EXIT", "Exit Exam", "Mock"]].map(([title, ...items]) => (
                    <div key={title} className="border-b border-slate-100 p-5 sm:border-r"><p className="mb-3 text-sm font-bold text-slate-700">{title} <span className="font-normal text-emerald-600">(All)</span></p><div className="grid grid-cols-2 gap-2">{items.map((item, index) => <span key={item} className="flex items-center gap-2 text-xs text-slate-600"><span className={`h-4 w-4 rounded border ${index === 0 ? "border-blue-500 bg-blue-500" : "border-slate-300"}`}>{index === 0 && <Check className="h-3.5 w-3.5 text-white" />}</span>{item}</span>)}</div></div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">Test configuration</p><h3 className="mt-1 text-xl font-bold text-slate-900">Practice Session 53</h3></div><Play className="h-7 w-7 text-blue-600" /></div>
                <div className="space-y-5 text-sm">
                  <div><div className="mb-2 flex justify-between text-slate-600"><span>Test mode</span><b className="text-slate-800">Practice</b></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700">Immediate feedback after each question</div></div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4"><p className="flex items-center gap-2 font-bold text-blue-800"><Target className="h-4 w-4" /> Track my progress</p><p className="mt-1 text-xs leading-5 text-blue-700">Record answers for history, performance and status-based filtering.</p></div>
                  <div><div className="mb-2 flex justify-between text-slate-600"><span>Number of questions</span><b className="text-slate-800">40</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="mp-progress-bar h-full w-2/5 rounded-full bg-blue-500" /></div></div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-2 text-slate-700"><RotateCcw className="h-4 w-4 text-blue-600" /> Randomize order</span><span className="h-5 w-9 rounded-full bg-blue-600 p-0.5"><span className="block h-4 w-4 translate-x-4 rounded-full bg-white" /></span></div>
                </div>
                <div className="mt-6 flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-white">Start test <ArrowRight className="h-4 w-4" /></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white py-18 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-[.92fr_1.08fr] lg:items-center">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Inside every session</p>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Stay inside the question, even when you need more context.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">The practice interface combines immediate answer feedback with the small tools students repeatedly need during revision.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {tools.map(([Icon, title, copy]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><Icon className="h-5 w-5 text-blue-600" /><h3 className="mt-3 font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></div>)}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xl shadow-slate-200/60">
                <div className="flex items-center justify-between bg-blue-500 px-5 py-4 text-white"><span className="text-sm font-bold">Item 6 of 16</span><div className="flex gap-4"><MessageSquare className="h-4 w-4" /><Flag className="h-4 w-4 text-yellow-300" /><FlaskConical className="h-4 w-4" /><Calculator className="h-4 w-4" /></div></div>
                <div className="p-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm"><div className="mb-3 flex gap-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">Year 2025</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">Exit Exam</span></div>A patient presents with fever, nausea and pain that migrated from the umbilicus to the right lower quadrant. What is the most likely diagnosis?</div>
                  <div className="mt-4 space-y-2"><div className="flex items-center rounded-xl border-2 border-emerald-400 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"><span className="mr-3 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200">A</span>Acute appendicitis<Check className="ml-auto h-4 w-4" /></div><div className="flex items-center rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span className="mr-3 flex h-7 w-7 items-center justify-center rounded-full border border-red-200">B</span>Diverticulitis</div><div className="flex items-center rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600"><span className="mr-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200">C</span>Acute gastroenteritis</div></div>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-800">Explanation</p><p className="mt-2 text-xs leading-5 text-slate-500">Migratory periumbilical pain localizing to the right lower quadrant is characteristic of acute appendicitis.</p></div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="analytics" className="border-y border-slate-200 bg-slate-950 py-18 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <Reveal className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">Progress with context</p><h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">One score is not the whole story.</h2></div>
            <p className="max-w-2xl text-lg leading-8 text-slate-400 lg:justify-self-end">Follow attempts, accuracy, question coverage, session history and saved notes. Category views expose the subjects that need the next block of attention.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-[.72fr_1.28fr]">
            <Reveal>
              <div className="grid h-full grid-cols-2 gap-3">
                {[[Trophy, "Overall score", "74%", "75 of 101 correct"], [BookOpenCheck, "Questions attempted", "286", "Across tracked sessions"], [History, "Study sessions", "33", "Completed and active"], [NotebookPen, "Saved notes", "12", "Linked to questions"]].map(([Icon, label, value, caption]) => { const ItemIcon = Icon as typeof Trophy; return <div key={label as string} className="rounded-xl border border-white/10 bg-white/[0.04] p-5"><ItemIcon className="h-5 w-5 text-blue-400" /><p className="mt-5 text-xs text-slate-400">{label as string}</p><strong className="mt-1 block text-3xl">{value as string}</strong><span className="mt-1 block text-[11px] text-slate-500">{caption as string}</span></div> })}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-slate-500">Performance by category</p><h3 className="mt-1 text-xl font-bold">Your learning pattern</h3></div><BarChart3 className="h-6 w-6 text-blue-400" /></div>
                <div className="mt-8 flex h-52 items-end gap-3 border-b border-l border-white/10 px-4 pb-0">
                  {[["IM", 82], ["PH", 78], ["PED", 66], ["OB", 58], ["SUR", 49], ["MIN", 35]].map(([name, height], index) => <div key={name as string} className="flex flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-400">{height}%</span><div className="mp-chart-bar w-full max-w-12 rounded-t bg-blue-500" style={{ height: `${height}%`, animationDelay: `${index * 110}ms` }} /><span className="pb-2 text-[10px] text-slate-500">{name}</span></div>)}
                </div>
                <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400"><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Correct</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> Incorrect</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-500" /> Unanswered</span></div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-blue-600">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-14 text-white sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10 lg:py-16">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Ready for the next session?</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Open MedPrep ET and make the next questions count.</h2><p className="mt-3 text-blue-100">Sign in with Google to create a test or continue an active session.</p></div>
          <Link href="/login" className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-white px-7 py-4 font-bold text-blue-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">Open MedPrep ET <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10"><AppLogo size="sm" /><p>Focused medical exam preparation for Ethiopia.</p><Link href="/login" className="font-semibold text-slate-700 hover:text-blue-600">Sign in to your account</Link></div>
      </footer>
    </main>
  )
}
