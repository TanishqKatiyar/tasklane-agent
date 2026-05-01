"use client";

import React from "react";

type KineticHeadingProps = {
  /**
   * Lines of text to display. Each line animates as a row of letters.
   * Strings render as plain text; React nodes (e.g. an <em> or accent
   * span) are rendered inline as their own animated unit.
   */
  lines: Array<string | React.ReactNode>;
  /** Base delay (s) between letters within a line. */
  letterStep?: number;
  /** Additional delay (s) between lines. */
  lineStep?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
};

function splitToLetters(text: string, lineDelay: number, letterStep: number) {
  const letters: React.ReactNode[] = [];
  Array.from(text).forEach((ch, i) => {
    const delay = lineDelay + i * letterStep;
    if (ch === " ") {
      letters.push(
        <span
          key={`s-${i}`}
          className="kinetic-letter"
          style={{
            animationDelay: `${delay}s`,
            // Preserve the space as a real, non-collapsing whitespace
            whiteSpace: "pre",
          }}
        >
          {" "}
        </span>,
      );
    } else {
      letters.push(
        <span
          key={`l-${i}`}
          className="kinetic-letter"
          style={{ animationDelay: `${delay}s` }}
        >
          {ch}
        </span>,
      );
    }
  });
  return letters;
}

/**
 * Renders display copy with letter-by-letter rise reveals.
 * Falls back to plain text under prefers-reduced-motion (handled in CSS).
 */
export function KineticHeading({
  lines,
  letterStep = 0.022,
  lineStep = 0.18,
  className,
  as: Tag = "h1",
}: KineticHeadingProps) {
  let runningDelay = 0;

  return (
    <Tag className={className}>
      {lines.map((line, lineIdx) => {
        const lineDelay = runningDelay;
        let content: React.ReactNode;

        if (typeof line === "string") {
          content = splitToLetters(line, lineDelay, letterStep);
          runningDelay = lineDelay + line.length * letterStep + lineStep;
        } else {
          // For ReactNode lines, animate as a single block.
          content = (
            <span
              className="kinetic-letter"
              style={{ animationDelay: `${lineDelay}s` }}
            >
              {line}
            </span>
          );
          runningDelay = lineDelay + lineStep + 0.3;
        }

        return (
          <span key={lineIdx} className="kinetic-line">
            {content}
          </span>
        );
      })}
    </Tag>
  );
}
