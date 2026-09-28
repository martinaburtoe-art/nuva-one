import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  motionKey: string;
};

// Preview deployment trigger: module motion visual QA.
export function ModuleMotionLabel({ label, icon: Icon, active, motionKey }: Props) {
  return (
    <span className="nuva-module-motion-label" data-module-motion={motionKey}>
      <span className="relative z-[1] truncate">{label}</span>
      {active && (
        <span key={motionKey} aria-hidden="true" className="nuva-module-motion-vehicle">
          <span className="nuva-module-motion-trail" />
          <Icon className="relative z-[1] h-5 w-5" strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}
