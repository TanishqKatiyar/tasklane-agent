"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import React, { memo } from "react";

import { useCountUp } from "@/hooks/use-count-up";

export type StatTone = "accent" | "dark" | "muted" | "paper";

type ToneSpec = {
  cardBg: string;
  cardText: string;
  rule: string;
  badgeBg: string;
  badgeText: string;
  bracket: string;
  metaSoft: string;
  showBrackets: boolean;
};

const TONE_STYLES: Record<StatTone, ToneSpec> = {
  accent: {
    cardBg: "var(--p-accent)",
    cardText: "var(--p-paper)",
    rule: "rgb(244 235 217 / 0.35)",
    badgeBg: "var(--p-paper)",
    badgeText: "var(--p-accent)",
    bracket: "rgb(244 235 217 / 0.55)",
    metaSoft: "rgb(244 235 217 / 0.7)",
    showBrackets: true,
  },
  dark: {
    cardBg: "var(--p-ink)",
    cardText: "var(--p-paper)",
    rule: "rgb(244 235 217 / 0.18)",
    badgeBg: "var(--p-accent)",
    badgeText: "var(--p-paper)",
    bracket: "rgb(244 235 217 / 0.35)",
    metaSoft: "rgb(244 235 217 / 0.55)",
    showBrackets: false,
  },
  muted: {
    cardBg: "var(--p-paper-muted)",
    cardText: "var(--p-ink)",
    rule: "rgb(28 15 9 / 0.18)",
    badgeBg: "var(--p-ink)",
    badgeText: "var(--p-paper)",
    bracket: "rgb(28 15 9 / 0.35)",
    metaSoft: "var(--p-ink-soft)",
    showBrackets: true,
  },
  paper: {
    cardBg: "var(--p-paper)",
    cardText: "var(--p-ink)",
    rule: "var(--p-rule)",
    badgeBg: "var(--p-ink)",
    badgeText: "var(--p-paper)",
    bracket: "rgb(28 15 9 / 0.3)",
    metaSoft: "var(--p-ink-soft)",
    showBrackets: false,
  },
};

function CornerBrackets({ color }: { color: string }) {
  const arm = 14;
  const thick = 1.5;
  const inset = 10;
  const common: React.CSSProperties = {
    position: "absolute",
    width: arm,
    height: arm,
    pointerEvents: "none",
  };
  return (
    <>
      <span
        style={{
          ...common,
          top: inset,
          left: inset,
          borderTop: `${thick}px solid ${color}`,
          borderLeft: `${thick}px solid ${color}`,
        }}
      />
      <span
        style={{
          ...common,
          top: inset,
          right: inset,
          borderTop: `${thick}px solid ${color}`,
          borderRight: `${thick}px solid ${color}`,
        }}
      />
      <span
        style={{
          ...common,
          bottom: inset,
          left: inset,
          borderBottom: `${thick}px solid ${color}`,
          borderLeft: `${thick}px solid ${color}`,
        }}
      />
      <span
        style={{
          ...common,
          bottom: inset,
          right: inset,
          borderBottom: `${thick}px solid ${color}`,
          borderRight: `${thick}px solid ${color}`,
        }}
      />
    </>
  );
}

function DeltaChip({
  delta,
  tone,
  mutedColor,
}: {
  delta: number;
  tone: StatTone;
  mutedColor: string;
}) {
  if (delta === 0) {
    return (
      <span
        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: mutedColor }}
      >
        <Minus className="h-3 w-3" /> flat
      </span>
    );
  }

  const isUp = delta > 0;
  const upColor =
    tone === "dark" || tone === "accent" ? "#74e2a3" : "#1b6b3d";
  const downColor =
    tone === "accent" ? "var(--p-paper)" : "var(--p-accent)";

  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums"
      style={{ color: isUp ? upColor : downColor }}
    >
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {isUp ? "+" : ""}
      {delta}
    </span>
  );
}

export interface StatCardProps {
  /** Reference code shown bottom-left, e.g. "#TLN-2026" */
  refCode: string;
  /** 1-based card index, used in section label and footer */
  index: number;
  /** Total cards in the row, shown in footer pagination */
  total: number;
  /** Section label, e.g. "PASS RATE" */
  label: string;
  /** Numeric value to display (animates from 0) */
  count: number;
  /** Optional suffix (e.g. "%") rendered after the number */
  suffix?: string;
  /** Decimal precision (handles smooth animation for non-integers) */
  decimals?: number;
  /** Delta vs previous period; 0 = flat, positive = up, negative = down */
  delta?: number;
  /** Color tone — controls bg, text, badge, brackets */
  tone: StatTone;
  /** Lucide icon component for the top-right badge */
  Icon: React.ElementType;
  /** Optional extra class names for grid sizing (e.g. "lg:col-span-5") */
  className?: string;
}

export const StatCard = memo(function StatCard({
  refCode,
  index,
  total,
  label,
  count,
  suffix,
  decimals = 0,
  delta = 0,
  tone,
  Icon,
  className = "",
}: StatCardProps) {
  const scale = Math.pow(10, decimals);
  const animatedRaw = useCountUp(Math.round(count * scale), 700);
  const styles = TONE_STYLES[tone];

  const displayValue =
    decimals > 0 ? (animatedRaw / scale).toFixed(decimals) : animatedRaw;

  return (
    <div
      className={`group relative flex min-h-[260px] flex-col justify-between overflow-hidden rounded-2xl p-7 transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      style={{ background: styles.cardBg, color: styles.cardText }}
    >
      {styles.showBrackets && <CornerBrackets color={styles.bracket} />}

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div
          className="font-mono text-[10px] uppercase leading-snug tracking-[0.22em]"
          style={{ color: styles.metaSoft }}
        >
          / {String(index).padStart(2, "0")} ·{" "}
          <span style={{ color: styles.cardText }}>{label}</span>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: styles.badgeBg, color: styles.badgeText }}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>

      <div className="relative z-10">
        <div className="p-stat-num text-[clamp(56px,6.5vw,96px)] leading-[0.9]">
          {displayValue}
          {suffix ? (
            <span className="ml-0.5 align-baseline">{suffix}</span>
          ) : null}
        </div>
      </div>

      <div className="relative z-10">
        <div className="mb-3 h-px w-full" style={{ background: styles.rule }} />
        <div className="flex items-end justify-between gap-3">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.2em]"
            style={{ color: styles.metaSoft }}
          >
            {refCode}
          </span>
          <div className="flex items-center gap-3">
            <DeltaChip delta={delta} tone={tone} mutedColor={styles.metaSoft} />
            <span
              className="font-mono text-[11px] uppercase tracking-[0.2em] tabular-nums"
              style={{ color: styles.metaSoft }}
            >
              {String(index).padStart(3, "0")}/{String(total).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
