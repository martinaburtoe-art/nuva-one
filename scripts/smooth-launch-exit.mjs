// The launch experience is now authored directly in React + styles.css.
// Keep this build hook as a no-op for backward compatibility with the existing
// package.json build script. It must never mutate source files or fail because
// an old inline-style anchor no longer exists.
process.stdout.write("Nüva launch build hook: source-owned styles, no patching required.\n");
