# Event verification, payment entry points, notifications

- Head Coach verification of coach event attendance is allowed across all branches, as explicitly requested. Coach accounts still cannot verify attendance, and Head Coach cannot verify Head Coach attendance.
- Pending event attendance is no longer hidden by a current-month-only filter. Head Coaches receive event check-in/out verification notifications.
- Notification panel renders through a body portal with viewport-constrained width and height and a scrollable list, escaping the header overflow clipping.
- Dashboard event cards link to event details; unpaid events with a positive fee expose a payment button. Event details render through a portal. Payment-only parents can access their event payment page.
- Existing event invoices can be resumed. Retrying failed event payment detaches the failed record and creates a new pending record transactionally, preserving the failed payment history.

## Checks

- Local production frontend build passed.
- Local integration tests passed for cross-branch verification, role denial, invoice resumption, failed-invoice retry against a mocked gateway, and paid event participant updates, plus existing session and attendance regression coverage.
- VPS Rintisan authenticated query returned response code 200 and PAID for an existing transaction. No live charge was initiated.
- Before deployment, VPS app and database were backed up to `/var/backups/sixstars/event-notification-fix-20260910`; `pg_restore --list` validated the dump archive.

## Pending input

Most production events have fee 0. No event fee has been changed; user input is needed to identify events and intended amounts. A zero-fee event does not generate a Rintisan billing.
