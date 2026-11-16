# Nüva One — Fluid Motion System

Date: 2026-11-16  
Scope: authenticated product interaction feedback only. No route, data, permission, database, billing or business-rule changes.

## Product objective

Make Nüva feel responsive and continuous during navigation and everyday work. Motion must clarify cause and effect, not decorate every surface or delay access to information.

## Motion tokens

| Token | Value | Intended use |
|---|---:|---|
| Fast | 140 ms | Press, focus, hover and control feedback |
| Base | 190 ms | Surface and border transitions |
| Enter | 230 ms | Route-level arrival |
| Content stagger | 0–84 ms | First four page-level content groups |
| Workspace stagger | 0–72 ms | First four workspace sections |

Easing: `cubic-bezier(0.2, 0.75, 0.25, 1)`.

## Interaction rules

1. Route arrival uses opacity and a 6 px translation only; no blur or layout reflow.
2. Stagger is short and limited to the first four content groups.
3. Hover lift is restricted to explicitly interactive surfaces and fine-pointer devices.
4. Ordinary cards remain still; dense tables highlight rows without translating them.
5. Buttons provide a brief pressed state; disabled controls do not animate as actionable.
6. Inputs show a consistent focus halo without changing geometry.
7. Mobile navigation retains 64 px minimum height and receives small active-state feedback.
8. Motion never communicates success, failure, or progress without a textual/state indicator.

## Accessibility

- All non-essential motion is disabled under `prefers-reduced-motion: reduce`.
- Focus remains visible and is not replaced by hover styling.
- Touch feedback does not depend on hover.
- Color is never the only indicator of the current state.

## Performance

- Animate opacity and transform rather than layout properties.
- Do not apply permanent `will-change` to every control.
- Avoid blur filters on route transitions.
- Keep hover movement limited to fine pointers.
- Do not animate every card or table cell.

## Acceptance checklist

- [ ] Preview build passes.
- [ ] Authenticated route changes are visually smooth and complete in under 300 ms.
- [ ] No content remains hidden after navigation or during failed requests.
- [ ] Touch interactions work at 320, 360, 390 and 430 px.
- [ ] Tablet and desktop hover states are restrained.
- [ ] Reduced-motion mode removes route, component, icon and decorative motion, including global sweeps.
- [ ] Reduced-motion mode disables smooth scrolling and hover/press transforms.
- [ ] Keyboard focus is visible on links, buttons, fields and navigation.
- [ ] Tables do not shift horizontally during hover.
- [ ] Dialogs, sheets and dropdowns remain usable with the new layer.
- [ ] No business logic, data access or permissions changed.

## Evidence boundary

The implementation is committed on a feature branch and opened as a draft PR. Automated CI, Vercel preview and authenticated visual checks must pass before this change can be accepted or promoted. A successful stylesheet commit is not proof of runtime behavior.
