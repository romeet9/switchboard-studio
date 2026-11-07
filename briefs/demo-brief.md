@weft-brief PRD-214: Bulk invoice approval

Problem: Approvers clear month-end queues of 40 to 150 invoices one at a time. It takes about 3 hours, and 22% of invoices miss the close.

Users: Finance approvers on a laptop. They are accountable, so they won't approve blind.

Screen: One "Approvals" screen listing invoices assigned to me, with supplier, amount with currency, due date and any flag (over PO, duplicate, new supplier). I can approve several at once. Flagged invoices can't be approved by accident, and approvals can be undone for a short time.

States: Only two: the queue, and just after a bulk approve with the undo toast.

Constraints: Desktop, Loom components only, existing statuses (Pending approval, Approved, Rejected).

Success: Median queue time drops from 3 hours to under 45 minutes.
