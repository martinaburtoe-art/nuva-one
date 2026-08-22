import { createFileRoute } from "@tanstack/react-router";

/**
 * Isolated cinematic laboratory. The production landing remains untouched.
 * This route exposes the complete scroll-driven home choreography for review.
 */
export const Route = createFileRoute("/experiencia")({
  component: CinematicExperience,
});

function CinematicExperience() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-black">
      <iframe
        title="Nüva One — Cinematic Home v3"
        src="/nuva-cinematic-v3.html"
        className="h-full w-full border-0"
        allow="fullscreen"
      />
    </main>
  );
}
