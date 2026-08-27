import { useEffect } from "react";
import { DemoWorkspace } from "./demo-workspace";

export function DemoCleanWorkspace({ onExit }: { onExit: () => void }) {
  useEffect(() => {
    const removeOwnerControls = () => {
      document.querySelectorAll("button").forEach((button) => {
        const text = button.textContent?.trim() ?? "";
        if (text.includes("Nüva Owner") || text.includes("Command Center")) {
          button.remove();
        }
      });
    };
    removeOwnerControls();
    const observer = new MutationObserver(removeOwnerControls);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <DemoWorkspace onExit={onExit} />;
}
