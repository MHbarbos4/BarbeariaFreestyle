import * as React from "react";

import { cn } from "@/lib/utils";

type TricolorWordmarkProps = {
  text: string;
  className?: string;
  /**
   * Se true, conta apenas letras/números para o agrupamento de 3.
   * Espaços e pontuação não entram no contador.
   */
  countOnlyLetters?: boolean;
};

const colorCycle = ["text-brand-green", "text-primary", "text-brand-red"] as const;

function isLetterLike(ch: string) {
  return /[0-9A-Za-zÀ-ÿ]/.test(ch);
}

export default function TricolorWordmark({ text, className, countOnlyLetters = true }: TricolorWordmarkProps) {
  let letterCount = 0;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1 font-brand leading-tight", className)} aria-label={text}>
      {Array.from(text).map((ch, i) => {
        const shouldCount = countOnlyLetters ? isLetterLike(ch) : true;
        const group = shouldCount ? Math.floor(letterCount / 3) : null;
        const cls = group === null ? "text-foreground" : colorCycle[group % 3];
        if (shouldCount) letterCount += 1;

        return (
          <span key={`${ch}-${i}`} className={cls}>
            {ch === " " ? "\u00A0" : ch}
          </span>
        );
      })}
    </span>
  );
}
