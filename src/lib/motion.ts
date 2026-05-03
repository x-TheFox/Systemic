import { Variants, Transition } from "framer-motion";

/* ── Spring presets ── */
export const springBouncy: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 15,
  mass: 0.8,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
  mass: 0.6,
};

export const springSmooth: Transition = {
  type: "spring",
  stiffness: 80,
  damping: 20,
  mass: 1,
};

export const easeSnap: Transition = {
  type: "tween",
  ease: [0.16, 1, 0.3, 1],
  duration: 0.4,
};

export const easeSmooth: Transition = {
  type: "tween",
  ease: [0.4, 0, 0.2, 1],
  duration: 0.3,
};

/* ── Page entrance choreography ── */
export const pageEntrance: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springBouncy,
  },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: easeSnap,
  },
};

export const scaleInItem: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springBouncy,
  },
};

/* ── Stat reveal (count-up spring) ── */
export const statReveal: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springSnappy,
  },
};

/* ── Rank reveal (staggered by rank order) ── */
export const rankContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const rankItem: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springBouncy,
  },
};

/* ── Pulse feed (flash + settle) ── */
export const pulseIn: Variants = {
  hidden: { opacity: 0, x: -30, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 22,
    },
  },
};

/* ── Skill tree node bloom ── */
export const nodeBloom: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springBouncy,
  },
};

export const nodePulse: Variants = {
  hidden: { scale: 1 },
  visible: {
    scale: [1, 1.06, 1],
    transition: {
      duration: 0.35,
      ease: "easeInOut",
    },
  },
};

/* ── Hover / lift micro-interactions ── */
export const hoverLift = {
  y: -3,
  boxShadow: "var(--z-float-shadow)",
  transition: springSnappy,
};

export const hoverGlow = {
  boxShadow: "0 0 24px hsl(265 85% 60% / 0.25)",
  transition: springSnappy,
};

/* ── Focus glow ── */
export const focusGlow = {
  boxShadow: "0 0 0 2px hsl(265 85% 60% / 0.4)",
  transition: { duration: 0.15 },
};

/* ── Route transition wrapper ── */
export const routeFade: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeSmooth },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

/* ── Badge cascade (by rarity) ── */
export const badgeContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

export const badgeItem: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springBouncy,
  },
};

/* ── Podium bloom ── */
export const podiumContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

export const podiumItem: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
    },
  },
};

/* ── Panel slide ── */
export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: springSmooth,
  },
};

/* ── Expand / collapse ── */
export const expandHeight: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    transition: {
      height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.25, delay: 0.05 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 1, 1] },
      opacity: { duration: 0.15 },
    },
  },
};
