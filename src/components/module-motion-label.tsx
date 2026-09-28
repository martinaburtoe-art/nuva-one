import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  motionKey: string;
  onFinish: () => void;
};

export function ModuleMotionLabel({ label, icon: Icon, active, motionKey, onFinish }: Props) {
  return (
    <span className="nuva-module-motion-label" data-module-motion={motionKey}>
      <span className="relative z-[1] truncate">{label}</span>
      {active && (
        <span
          key={motionKey}
          aria-hidden="true"
          className="nuva-module-motion-vehicle"
          onAnimationEnd={onFinish}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </span>
      )}
    </span>
  );
}
