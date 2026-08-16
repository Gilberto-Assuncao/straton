"use client";

import { useState } from "react";

/**
 * Keeps what was typed after a refusal, and drops the message once it is edited
 * (#74).
 *
 * Two problems, one cause. A server action re-renders a fresh form, so
 * uncontrolled fields come back empty — and the message describing the attempt
 * stays on screen next to boxes that no longer contain the attempt. On the
 * availability form that produced a *ghost* error: the dates cleared, the
 * refusal remained, and somebody retyped good dates under a red sentence about
 * an attempt that no longer existed. It cost real time to diagnose, because
 * the evidence had been destroyed by the same bug.
 *
 * The message belongs to the attempt that produced it. `touched` is the whole
 * rule: the moment anything changes, the sentence is describing something that
 * is gone, so it goes too.
 *
 * `seed` is what identifies one attempt from the next. Keyed on the returned
 * values *and* the message, so two identical submissions that both fail still
 * count as two attempts and the message reappears — otherwise pressing the
 * button again would look like nothing happened.
 */
export function useSubmittedValues(seed: string) {
  const [touched, setTouched] = useState(false);
  const [seenSeed, setSeenSeed] = useState(seed);

  // Rendered-time reset rather than an effect: this is derived state, and an
  // effect would paint the stale message for one frame before clearing it.
  if (seenSeed !== seed) {
    setSeenSeed(seed);
    setTouched(false);
  }

  return {
    /** True once the person has edited anything since the last answer. */
    touched,
    /** Put on the fields: any change retires the message. */
    onInput: () => setTouched(true),
    /**
     * Remounts the inputs when a new answer arrives, so `defaultValue` takes
     * effect without making every field a controlled component.
     */
    formKey: seed,
  };
}
