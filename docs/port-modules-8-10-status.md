# RCM modules 8-10 port status

Target repo: `therassistantllc/ehr`.

Database inspection confirmed existing source-of-truth tables for:

- client ledger entries
- client balance summaries
- client invoices and invoice lines
- credit balances and transfers
- overpayment reviews
- refund requests, approvals, and payments
- AR, denial, payment, payer mix, productivity, and daily flash report tables

The port should extend these tables instead of creating duplicate patient balance, statement, refund, or reporting sources.
