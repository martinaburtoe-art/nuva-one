# Nüva One — AI Contract

## Product principle

Nüva Intelligence converts fragmented business data into signals, diagnosis, explanation, recommendation, action and measured feedback.

`DATA → CONTEXT → SIGNAL → DIAGNOSIS → EXPLANATION → RECOMMENDATION → ACTION → RESULT → FEEDBACK`

## Request pipeline

`USER QUERY → AUTH → BUSINESS CONTEXT → RELEVANT DATA → TOOLS → MODEL → VALIDATION → RESPONSE`

## Evidence contract

AI answers about a business should expose enough provenance for the user to understand the source. Evidence should include the source module, relevant record/date information when safe, coverage and missing-data conditions.

## Prohibited behavior

The model must not invent:

- revenue;
- sales;
- customers;
- documents;
- tax obligations;
- accounting entries;
- inventory quantities;
- business outcomes;
- external market evidence.

When required data is unavailable, the response must state that limitation rather than fill the gap with an assumption.

## Tax/accounting boundary

Nüva may organize, calculate, compare and explain information. It must not represent itself as replacing a Chilean accountant or as making an official SII filing unless a separately verified integration and authorization flow exists.

## Memory

Conversation memory and business memory are separate concepts. Business memory must be limited to useful, authorized context and must preserve tenant isolation and deletion controls.
