/**
 * What is left of this file, and why the rest went.
 *
 * It held ten exports. One of them, `colors`, was the third definition of this
 * product's palette — twelve hexadecimals that disagreed with `globals.css`
 * *and* with the 1826 written into components. #108 named the one that renders
 * and this one stayed behind, imported by nothing, quietly available to
 * anybody who went looking for "the design tokens" and found the wrong ones.
 *
 * `spacing`, `radius`, `typography`, `shadows`, `animations`, `zIndex`,
 * `breakpoints` and `durations` went for a duller reason: nothing imported
 * them either, and Tailwind's own scales are what the components actually use.
 * Checked one at a time rather than as a group — the first count said
 * `typography` and `zIndex` had two uses each, and all four turned out to be
 * the word appearing in a comment or a CSS property of the same name.
 *
 * `componentClasses` stays because eighteen call sites import it, and because
 * it is the one thing here that was never a second opinion: it composes
 * utilities that resolve to the tokens in `globals.css`.
 */
export const componentClasses = {
  focus: "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
  control:
    "min-h-11 rounded-lg border border-edge-10 bg-surface-alt px-4 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
  surface: "rounded-2xl border border-edge-10 bg-surface",
} as const;
