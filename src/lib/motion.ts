"use client";
/**
 * SYSTEMICS — Motion System
 * Prismatic Trophy Case — Shared animation primitives
 *
 * Every animated component imports from this module.
 * No arbitrary Framer Motion values — all defined here.
 */

import type { Variants } from "framer-motion";

/* ═══════════════════════════════════════════
   Spring Configs
   ═══════════════════════════════════════════ */

export const springs = {
  /** Gentle — large movements, page sections */
  gentle: { type: "spring" as const, stiffness: 120, damping: 14, mass: 1 },
  /** Snappy — node position changes, data updates */
  snappy: { type: "spring" as const, stiffness: 300, damping: 20, mass: 0.8 },
  /** Bouncy — micro-interactions, badge unlocks, buttons */
  bouncy: { type: "spring" as const, stiffness: 200, damping: 12, mass: 0.6 },
  /** Heavy — large hero elements */
  heavy: { type: "spring" as const, stiffness: 80, damping: 12, mass: 1.2 },
};

/* ═══════════════════════════════════════════
   Easing (match CSS tokens)
   ═══════════════════════════════════════════ */

export const easings = {
  bounce: [0.34, 1.56, 0.64, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
};

/* ═══════════════════════════════════════════
   Durations (match CSS tokens)
   ═══════════════════════════════════════════ */

export const durations = {
  instant: 0.1,
  fast: 0.2,
  standard: 0.4,
  slow: 0.7,
};

/* ═══════════════════════════════════════════
   Cascade — Page entrance choreography
   ═══════════════════════════════════════════ */

export const cascadeVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.standard,
      ease: easings.outExpo,
      delay: 0.1 + i * 0.08,
    },
  }),
};

export const heroCascadeVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: durations.slow,
      ease: easings.outExpo,
      delay: 0.05,
    },
  },
};

export const childCascadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: {
      duration: durations.fast,
      delay: 0.25 + i * 0.04,
    },
  }),
};

/* ═══════════════════════════════════════════
   Stat Counter — Number counting animation
   ═══════════════════════════════════════════ */

export const statGlowVariants: Variants = {
  initial: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.4,
      ease: easings.bounce,
    },
  },
};

/* ═══════════════════════════════════════════
   Skill Tree Node Variants
   ═══════════════════════════════════════════ */

export const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  entering: (depth: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: depth * 0.15,
      duration: 0.35,
      ease: easings.bounce,
    },
  }),
  unlockedPulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.4, ease: "easeInOut" },
  },
  breathe: {
    scale: [1, 1.005, 1],
    transition: {
      duration: 3,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "reverse" as const,
    },
  },
};

/* ═══════════════════════════════════════════
   Badge Unlock Variants
   ═══════════════════════════════════════════ */

export const badgeUnlockVariants: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: [0, 1.05, 1],
    transition: {
      duration: 0.4,
      ease: easings.bounce,
    },
  },
};

/* ═══════════════════════════════════════════
   Hover Micro-Interactions
   ═══════════════════════════════════════════ */

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -2,
    transition: { duration: durations.fast, ease: easings.bounce },
  },
};

export const buttonHover = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    y: -1,
    transition: { duration: durations.instant, ease: easings.smooth },
  },
  tap: {
    scale: 0.97,
    y: 1,
    transition: { duration: 0.08, ease: easings.smooth },
  },
};

export const badgeHover = {
  rest: { scale: 1, rotateX: 0, rotateY: 0 },
  hover: {
    scale: 1.05,
    transition: { duration: durations.fast, ease: easings.bounce },
  },
};

/* ═══════════════════════════════════════════
   Page Transition
   ═══════════════════════════════════════════ */

export const pageTransition: Variants = {
  initial: { opacity: 0, scale: 0.98 },
  enter: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.standard, ease: easings.outExpo },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15, ease: easings.smooth },
  },
};

/* ═══════════════════════════════════════════
   Fade In — Simple utility
   ═══════════════════════════════════════════ */

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.standard, ease: easings.outExpo },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.standard,
      ease: easings.outExpo,
      delay,
    },
  }),
};

/* ═══════════════════════════════════════════
   Scale In — For modals, dialogs
   ═══════════════════════════════════════════ */

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springs.bouncy,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: durations.fast, ease: easings.smooth },
  },
};

/* ═══════════════════════════════════════════
   Slide Up — For toasts, bottom sheets
   ═══════════════════════════════════════════ */

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.gentle,
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: durations.fast },
  },
};
