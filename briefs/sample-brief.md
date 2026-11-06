# Sample brief (paste into the room to run the demo)

Post the block below in the Switchboard Studio room and mention the brief agent. It is deliberately a little incomplete (no viewport, no scale numbers) so the brief agent has a real clarifying question to ask on camera.

---

@brief

**PRD-214: Bulk invoice approval for finance approvers**

**Problem.** Approvers at mid-size customers approve supplier invoices one at a time from an email link. Finance leads tell us month-end close slips because approvers with 40 to 150 invoices waiting in a queue open each one, check it, approve it, and go back. Median time to clear a month-end queue is about 3 hours; 22% of invoices are approved after the close deadline. Support tickets mentioning "approve all" are up 3x this quarter.

**Who.** Finance approvers (AP managers and department heads) at B2B customers with 50 to 500 employees. They use the product a few times a week, in bursts at month end, mostly on a laptop. They are accountable for what they approve, so they will not approve blind.

**What is user-facing.** A new "Approvals" screen that lists invoices waiting on the current user and lets them review and approve several at once. They need to see supplier, amount, due date, who raised it, and any flag (for example amount over PO, duplicate suspected, new supplier) without opening each invoice. Bulk approve must be safe: flagged invoices must not be approved by accident, and approvals should be undoable for a short time.

**Constraints.** Must use existing invoice statuses (Draft, Pending approval, Approved, Rejected). No new permissions model. Approvers can only act on invoices assigned to them. Amounts must show currency; multi-currency queues are common.

**Success metric.** Cut median month-end queue clearing time from 3 hours to under 45 minutes within one quarter, with no increase in post-approval corrections.

**Out of scope.** Editing invoice line items, the approval-rule builder, mobile.

---

## Why this is a good demo

- One screen, one clear job (clear a queue safely), so three variants are easy to compare at a glance.
- Natural spread for the variants: A is a table with checkboxes and a sticky bulk-action bar (familiar); B is a focused review flow, one invoice at a time with keyboard-friendly next/approve (task-first); C is a triaged queue that splits "safe to approve" from "needs a look" and offers one-click approve on the safe group (ambitious).
- Rich on-system surface for the Loom library: Table, Badge, Alert, Tabs, Button and Button Group, Checkbox, Search Input, Pagination, Toast (for undo), Empty State, Side Nav or Top Nav.
- Accessibility talking points for the critic: status that must not rely on colour alone, target sizes on row actions, one primary action per region, destructive-adjacent bulk action hierarchy.
