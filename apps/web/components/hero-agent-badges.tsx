"use client"

import type { ReactNode } from "react"
import { motion } from "motion/react"

import { Claude } from "@/components/svgs/claude"
import { Cursor } from "@/components/svgs/cursor"
import { GitHubCopilot } from "@/components/svgs/githubCopilot"
import { OpencodeIcon } from "@/components/svgs/opencode"
import { cn } from "@workspace/ui/lib/utils"

type FloatingBadgeProps = {
  className?: string
  children: ReactNode
  duration: number
  delay: number
  distance?: number
  drift?: number
  rotate?: number
}

function FloatingBadge({
  className,
  children,
  duration,
  delay,
  distance = 10,
  drift = 3,
  rotate = 2,
}: FloatingBadgeProps) {
  return (
    <motion.div
      className={cn(
        "pointer-events-none absolute hidden size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xl shadow-[0_18px_45px_-30px_rgba(255,255,255,0.7)] md:flex [&_svg]:h-7 [&_svg]:w-auto",
        className
      )}
      animate={{
        y: [0, -distance, 0],
        x: [0, drift, 0],
        rotate: [0, rotate, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  )
}

export function HeroAgentBadges() {
  return (
    <>
      <FloatingBadge className="-left-16 -top-6" duration={6.2} delay={0}>
        <Claude />
      </FloatingBadge>
      <FloatingBadge
        className="right-10 -top-10"
        duration={7}
        delay={0.5}
        drift={-2}
        rotate={-2}
      >
        <Cursor />
      </FloatingBadge>
      <FloatingBadge
        className="-left-24 bottom-1"
        duration={6.6}
        delay={0.9}
        distance={8}
        drift={2}
        rotate={1.5}
      >
        <GitHubCopilot />
      </FloatingBadge>
      <FloatingBadge
        className="right-0 bottom-1"
        duration={7.4}
        delay={0.2}
        distance={9}
        drift={-3}
        rotate={2.5}
      >
        <OpencodeIcon />
      </FloatingBadge>
    </>
  )
}
