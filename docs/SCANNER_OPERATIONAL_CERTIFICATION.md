# Nüva One — Scanner Operational Certification

## Purpose

This checklist defines the production acceptance criteria for using a mobile phone as the barcode scanner alongside the POS.

## Core flow

`camera/HID/native input -> normalize -> product resolver -> operation -> stock/cash/audit`

## Product onboarding

- [ ] Unknown scanned code opens the new-product flow with the scanned code prefilled.
- [ ] User can create a new SKU from the scanner flow.
- [ ] User can associate an unknown code with an existing product.
- [ ] Multiple codes can point to one product.
- [ ] Newly created code resolves immediately on the next scan.
- [ ] SKU uniqueness is enforced per business.

## POS

- [ ] Scan adds an existing product to the cart.
- [ ] Repeated scans increment quantity instead of creating duplicate lines.
- [ ] Sale is transactional and idempotent.
- [ ] Sale updates inventory through the canonical stock movement path.
- [ ] Sale is linked to the active business/cash session.

## Inventory

- [ ] Continuous scan remains on the camera after each successful read.
- [ ] Express count supports repeated scans without navigation away from the scanner.
- [ ] Failed line persistence prevents count finalization.
- [ ] Approved differences become audited stock movements.

## Operational modules

- [ ] Purchase receiving validates expected vs received quantities.
- [ ] Picking rejects an incorrect product.
- [ ] Dispatch records the completed operation.
- [ ] Returns record disposition (restock/damaged/quarantine/loss).
- [ ] Waste records reason and movement.
- [ ] Transfers enforce source availability and record origin/destination.

## Security

- [ ] Product and product-code RLS remains enabled.
- [ ] Scanner RPC privileges remain restricted.
- [ ] Tenant A cannot resolve or mutate tenant B data.
- [ ] Client-provided business identifiers are never trusted for authorization.

## Production acceptance

A feature is not certified by a successful build alone. It must have a passing automated test where practical, a successful deployment, and a verified production flow. The status must remain **NOT CERTIFIED** until every applicable checkbox above has evidence.