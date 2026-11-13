export type PwaNoticeKind = "install" | "update" | null;

export function getPwaNoticeKind(input: {
  canInstall: boolean;
  installDismissed: boolean;
  updateReady: boolean;
  updateDismissed: boolean;
}): PwaNoticeKind {
  // Updates take priority and have their own dismissal state. Dismissing or
  // completing installation must never suppress a later service-worker update.
  if (input.updateReady && !input.updateDismissed) return "update";
  if (input.canInstall && !input.installDismissed) return "install";
  return null;
}
