import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  GraduationCap,
  NotebookPen,
  RotateCcw,
  Stethoscope,
  Target,
} from "lucide-react"
import { AppLogo } from "@/components/ui/app-logo"

const featureGroups = [
  {
    number: "01",
    title: "Build the right question set",
    description:
      "Choose the specialty, exam type, year and difficulty you want to work on. Use the full bank or set a focused question limit.",
    points: ["Specialty and exam filters", "Difficulty and year selection", "Randomized question order"],
    icon: ClipboardCheck,
  },
  {
    number: "02",
    title: "Practice or simulate the exam",
    description:
      "Study without a clock when you are learning, or add a time limit when you want a realistic exam session.",
    points: ["Practice and exam modes", "Timed sessions", "Pause and resume support"],
    icon: Clock3,
  },
  {
    number: "03",
    title: "Learn while you answer",
    description:
      "Keep the tools you need inside the question view, so reviewing a calculation or recording a note does not interrupt your session.",
    points: ["Personal notes", "Calculator and lab values", "Flags and question feedback"],
    icon: NotebookPen,
  },
  {
    number: "04",
    title: "Turn attempts into direction",
    description:
      "Review results, return to past sessions and see how accuracy changes across topics—not just one final score.",
    points: ["Detailed result review", "Session history", "Category performance trends"],
    icon: BarChart3,
  },
]

const specialties = ["Internal Medicine", "Surgery", "Pediatrics", "OB/GYN", "Public Health"]

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1e8] text-[#152a34]">
      <header className="border-b border-[#152a34]/15 bg-[#f5f1e8]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" aria-label="MedPrep ET home">
            <AppLogo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Main navigation">
            <a className="transition-colors hover:text-[#b54932]" href="#how-it-works">How it works</a>
            <a className="transition-colors hover:text-[#b54932]" href="#features">Features</a>
            <a className="transition-colors hover:text-[#b54932]" href="#progress">Progress</a>
          </nav>
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-2 border border-[#152a34] bg-[#152a34] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#b54932]"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative border-b border-[#152a34]/15">
        <div className="absolute inset-y-0 right-0 hidden w-[42%] border-l border-[#152a34]/10 bg-[#e4eadf] lg:block" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-12 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-7 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b54932]">
              <span className="h-px w-10 bg-[#b54932]" />
              Medical exam preparation, built for Ethiopia
            </div>
            <h1 className="max-w-3xl font-serif text-5xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              Make every question count.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#40545c] sm:text-xl">
              MedPrep ET helps medical students create focused practice sessions, simulate timed exams and use every result to decide what to study next.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 bg-[#b54932] px-6 font-semibold text-white transition-colors hover:bg-[#943b2a]"
              >
                Start studying <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center border border-[#152a34]/30 px-6 font-semibold transition-colors hover:border-[#152a34] hover:bg-white/50"
              >
                Explore the platform
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#152a34]/15 pt-6 text-sm text-[#40545c]">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#397267]" /> Focused question sets</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#397267]" /> Timed exam mode</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#397267]" /> Progress tracking</span>
            </div>
          </div>

          <div className="relative lg:pl-10">
            <div className="absolute -left-3 top-10 hidden font-serif text-[10rem] leading-none text-[#152a34]/[0.035] lg:block">M</div>
            <div className="relative border border-[#152a34]/20 bg-[#fffdf8] shadow-[12px_12px_0_0_#152a34]">
              <div className="flex items-center justify-between border-b border-[#152a34]/15 px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b7b80]">New study session</p>
                  <p className="mt-1 font-serif text-xl font-semibold">Clinical review · 40 questions</p>
                </div>
                <span className="border border-[#397267]/30 bg-[#e4eadf] px-3 py-1 text-xs font-bold text-[#28594f]">Practice</span>
              </div>
              <div className="p-5 sm:p-6">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[#6b7b80]">Selected specialties</p>
                <div className="flex flex-wrap gap-2">
                  {specialties.slice(0, 3).map((specialty, index) => (
                    <span
                      key={specialty}
                      className={index === 0 ? "bg-[#152a34] px-3 py-2 text-sm text-white" : "border border-[#152a34]/20 px-3 py-2 text-sm"}
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
                <div className="my-6 grid grid-cols-3 divide-x divide-[#152a34]/15 border-y border-[#152a34]/15 py-4 text-center">
                  <div><strong className="block font-serif text-2xl">40</strong><span className="text-xs text-[#6b7b80]">Questions</span></div>
                  <div><strong className="block font-serif text-2xl">All</strong><span className="text-xs text-[#6b7b80]">Years</span></div>
                  <div><strong className="block font-serif text-2xl">Mix</strong><span className="text-xs text-[#6b7b80]">Difficulty</span></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between border border-[#152a34]/15 p-3">
                    <span className="flex items-center gap-3 text-sm font-medium"><RotateCcw className="h-4 w-4 text-[#397267]" /> Randomize question order</span>
                    <span className="h-5 w-9 rounded-full bg-[#397267] p-0.5"><span className="block h-4 w-4 translate-x-4 rounded-full bg-white" /></span>
                  </div>
                  <div className="flex items-center justify-between border border-[#152a34]/15 p-3">
                    <span className="flex items-center gap-3 text-sm font-medium"><Target className="h-4 w-4 text-[#397267]" /> Track this session in progress</span>
                    <span className="h-5 w-9 rounded-full bg-[#397267] p-0.5"><span className="block h-4 w-4 translate-x-4 rounded-full bg-white" /></span>
                  </div>
                </div>
                <div className="mt-5 flex h-12 items-center justify-center gap-2 bg-[#152a34] font-semibold text-white">
                  Begin session <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
            <p className="mt-6 max-w-md text-sm leading-6 text-[#40545c] lg:ml-8">
              Filter the bank to match today&apos;s objective—not somebody else&apos;s study plan.
            </p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-[#152a34]/15 bg-[#fffdf8]">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[.62fr_1.38fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b54932]">A clearer study loop</p>
              <h2 className="mt-4 max-w-sm font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Choose. Answer. Review. Adjust.</h2>
            </div>
            <div className="grid border-l border-t border-[#152a34]/15 sm:grid-cols-2">
              {[
                ["1", "Choose your focus", "Build a session from the specialties, years, exam types and difficulty levels you need."],
                ["2", "Set the conditions", "Use open practice for learning or a timed exam when you need pressure and pacing."],
                ["3", "Work through the questions", "Navigate, flag, take notes and use clinical reference tools without leaving the session."],
                ["4", "Review what changed", "Inspect results and performance history, then build the next session around weak areas."],
              ].map(([step, title, copy]) => (
                <article key={step} className="border-b border-r border-[#152a34]/15 p-6 sm:p-8">
                  <span className="font-serif text-3xl text-[#b54932]">{step}</span>
                  <h3 className="mt-8 text-lg font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#52646b]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-[#152a34]/15">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-12 flex flex-col justify-between gap-6 border-b border-[#152a34]/20 pb-8 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b54932]">What is inside</p>
              <h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">A complete workspace for question-based revision.</h2>
            </div>
            <p className="max-w-md text-base leading-7 text-[#52646b]">Everything is organized around the work of preparing: selecting useful questions, completing a serious session and understanding the outcome.</p>
          </div>
          <div className="grid gap-px overflow-hidden border border-[#152a34]/15 bg-[#152a34]/15 md:grid-cols-2">
            {featureGroups.map(({ number, title, description, points, icon: Icon }) => (
              <article key={number} className="bg-[#f5f1e8] p-6 sm:p-8 lg:p-10">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs font-bold tracking-[0.15em] text-[#b54932]">{number}</span>
                  <Icon className="h-7 w-7 text-[#397267]" />
                </div>
                <h3 className="mt-10 font-serif text-2xl font-semibold">{title}</h3>
                <p className="mt-4 max-w-xl leading-7 text-[#52646b]">{description}</p>
                <ul className="mt-7 space-y-3 text-sm font-medium">
                  {points.map((point) => <li key={point} className="flex items-center gap-3"><span className="h-1.5 w-1.5 bg-[#b54932]" />{point}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="progress" className="border-b border-[#152a34]/15 bg-[#152a34] text-white">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:px-12 lg:py-24">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e6a56c]">Progress with context</p>
            <h2 className="mt-4 max-w-xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Your score is one signal. The pattern matters more.</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">MedPrep ET keeps session history, accuracy, question coverage and category performance together so you can see both effort and understanding.</p>
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {[
                [Target, "Accuracy by category"],
                [BookOpen, "Unique questions covered"],
                [Clock3, "Study time and pacing"],
                [BarChart3, "Progress over time"],
              ].map(([Icon, label]) => {
                const FeatureIcon = Icon as typeof Target
                return <div key={label as string} className="flex items-center gap-3 border-t border-white/20 pt-4 text-sm font-semibold"><FeatureIcon className="h-5 w-5 text-[#e6a56c]" />{label as string}</div>
              })}
            </div>
          </div>
          <div className="border border-white/20 bg-[#1b3540] p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/15 pb-5">
              <div><p className="text-xs uppercase tracking-[0.18em] text-white/50">Study overview</p><p className="mt-1 font-serif text-2xl">Your recent performance</p></div>
              <GraduationCap className="h-7 w-7 text-[#e6a56c]" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/15 border-b border-white/15 py-6 text-center">
              <div><strong className="block font-serif text-3xl">74%</strong><span className="text-xs text-white/50">Accuracy</span></div>
              <div><strong className="block font-serif text-3xl">286</strong><span className="text-xs text-white/50">Reviewed</span></div>
              <div><strong className="block font-serif text-3xl">8</strong><span className="text-xs text-white/50">Sessions</span></div>
            </div>
            <div className="space-y-5 pt-6">
              {[["Internal Medicine", "82%", "w-[82%]"], ["Pediatrics", "71%", "w-[71%]"], ["Surgery", "64%", "w-[64%]"]].map(([name, value, width]) => (
                <div key={name}>
                  <div className="mb-2 flex justify-between text-sm"><span>{name}</span><span className="font-mono text-[#e6a56c]">{value}</span></div>
                  <div className="h-2 bg-white/10"><div className={`h-full bg-[#e6a56c] ${width}`} /></div>
                </div>
              ))}
            </div>
            <p className="mt-7 border-l-2 border-[#e6a56c] pl-4 text-sm leading-6 text-white/65">Illustrative dashboard preview. Your account reflects your own completed and tracked sessions.</p>
          </div>
        </div>
      </section>

      <section className="bg-[#e4eadf]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:px-12 lg:py-20">
          <div>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#397267]"><Stethoscope className="h-4 w-4" /> Ready for the next session?</div>
            <h2 className="mt-4 max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Study with a purpose, not just a question count.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#52646b]">Sign in with Google to build a focused test and continue from where you left off.</p>
          </div>
          <Link href="/login" className="inline-flex h-14 items-center justify-center gap-3 bg-[#b54932] px-7 font-bold text-white transition-colors hover:bg-[#943b2a]">Open MedPrep ET <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>

      <footer className="border-t border-[#152a34]/15 bg-[#f5f1e8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-[#52646b] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <AppLogo size="sm" />
          <p>Focused preparation for medical students in Ethiopia.</p>
          <Link href="/login" className="font-semibold text-[#152a34] hover:text-[#b54932]">Sign in to your account</Link>
        </div>
      </footer>
    </main>
  )
}
