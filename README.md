# THERASSISTANT EHR

**THERASSISTANT EHR** is a behavioral-health-focused electronic health record, revenue cycle management, credentialing, document routing, and patient engagement platform built for independent clinicians, group practices, and billing companies.

The platform is designed to connect clinical care, documentation, payer compliance, pre-session preparation, client engagement, paper mail, claim submission, payment posting, denial management, patient balances, credentialing, payer contracts, and financial reporting in one system.

THERASSISTANT EHR is not intended to be a generic EHR. It is built around the specific operational needs of behavioral health providers and the revenue cycle workflows that support them.

---

## Product Vision

THERASSISTANT EHR helps behavioral health providers operate independently while maintaining control over clinical documentation, client communication, payer rules, billing workflows, claim history, provider enrollment, payer contracts, paper mail, payments, credits, refunds, and financial reporting.

The platform combines:

* Electronic health records
* Behavioral health documentation workflows
* Client portal tools
* Pre-Session Dashboard for clinical preparation
* In-Between Session Journal for client reflection and provider review
* Pre-Session Review for billing and administrative readiness
* Medicaid and commercial coding support
* Golden Thread documentation support
* Charge capture
* Claims management
* Claim batch tracking
* Payment posting
* Historical payment posting
* Client ledger
* Denial management
* AR follow-up
* Patient responsibility billing
* Refund and credit workflows
* Credentialing and enrollment tracking
* Payer contract and fee schedule management
* Mailroom document upload, routing, filing, and linking
* Workqueues
* Reporting
* Multi-practice billing company support
* Audit logging
* Imports and integrations

The goal is to create a system where clinical documentation, payer compliance, client engagement, billing workflows, and financial data are connected instead of scattered across disconnected software, spreadsheets, email, portals, paper mail, and downloads.

---

## Core Users

THERASSISTANT EHR supports multiple user types:

* Platform administrators
* Practice administrators
* Billing company administrators
* Billing company staff
* Clinicians
* Supervisors
* Front desk staff
* Credentialing staff
* Revenue cycle specialists
* Patient portal users
* Read-only or limited-access users

---

## Core Design Principles

THERASSISTANT EHR is designed around these principles:

### Behavioral Health First

The system is built for therapy, psychiatry, substance use treatment, peer support, case management, crisis services, skills training, and community-based behavioral health services.

### Clinical and Billing Work Together

Documentation, treatment goals, diagnoses, authorizations, payer rules, provider enrollment, charges, claims, and payments should connect to each other.

### Billing Company Aware

Billing companies should be able to support multiple practices with scoped access, without mixing unrelated practice data.

### Pre-Session Preparation Matters

The system separates clinical preparation from administrative preparation:

* **Pre-Session Dashboard** helps the provider prepare clinically.
* **Pre-Session Review** helps staff verify billing and administrative readiness.

### Client Voice Should Be Captured Safely

The system supports client-submitted check-ins and journal entries while keeping provider-authored documentation separate, reviewable, editable, and auditable.

### Historical Financial Accuracy

Practices should be able to preserve old balances, payments, credits, refunds, adjustments, and financial history without recreating historical claims.

### Mailroom-Driven Document Control

Paper mail, payer letters, EOBs, authorization letters, credentialing notices, refund requests, and other documents should be uploaded, routed, filed, linked, searched, and audited.

### Workqueue-Driven Operations

Users should know what needs attention without digging through spreadsheets, inboxes, paper stacks, downloads, or disconnected folders.

### Credentialing-Aware Billing

Claims should account for provider enrollment, payer participation, effective dates, terminations, contracting status, and billing provider rules.

### Clear Source of Truth

The database should avoid duplicate source-of-truth tables and conflicting financial records.

---

# Multi-Tenant Architecture

THERASSISTANT EHR uses a multi-tenant model.

Supported tenant types may include:

* Platform tenant
* Practice tenant
* Billing company tenant

A billing company can be linked to multiple practice tenants. This allows billing company staff to work claims, payments, denials, AR follow-up, Mailroom items, credentialing issues, and reports for linked practices while maintaining data separation.

## Tenant Access Model

The access model should support:

* A user belonging to one or more tenants
* A user having different roles in different tenants
* A billing company having scoped access to linked practices
* A practice controlling which billing company has access
* Clinical records and financial records being permission-gated separately
* Mailroom documents being permission-gated by document type and linked record
* Patient portal access being limited to the client’s own information
* Platform administrators having elevated oversight access

## Example Role Hierarchy

```text
Platform Admin
  └── Practice Admin
        ├── Clinician
        ├── Supervisor
        ├── Biller
        ├── Front Desk
        ├── Credentialing Staff
        └── Read-Only User

Billing Company Tenant
  └── Billing Company Admin
        └── Billing Staff
              └── Scoped access to linked Practice Tenants
```

---

# Major Modules

## Authentication and Security

THERASSISTANT EHR should support secure access controls for clinical, financial, administrative, document, and patient portal data.

Key features include:

* Supabase Auth
* Role-based access control
* Tenant-aware permissions
* Practice-level permissions
* Provider-level access
* Clinical record access controls
* Financial record access controls
* Mailroom document access controls
* Patient portal restrictions
* Audit logging
* Row-Level Security policies

---

## Tenants and Organizations

Organization-level features include:

* Tenants
* Practices
* Billing companies
* Billing company to practice links
* Practice locations
* Billing entities
* Service facilities
* Organization settings
* Tenant settings

---

## Users and Roles

User and role features include:

* User profiles
* Tenant memberships
* Practice memberships
* Role assignments
* Permission groups
* Staff status
* Access history
* Cross-practice billing access

---

## Providers

Provider features include:

* Provider profiles
* Credentials
* NPI
* Taxonomy
* Licenses
* Supervising provider relationships
* Rendering provider setup
* Billing provider setup
* Enrollment records
* Payer participation
* Effective dates
* Termination dates
* Credentialing notes
* Provider document file
* Provider-specific workqueues

---

## Clients

Client features include:

* Client profiles
* Demographics
* Responsible parties
* Emergency contacts
* Insurance policies
* Coverage history
* Financial responsibility
* Account notes
* Clinical chart
* Client ledger
* Client document file
* Client portal access
* Message history
* Journal history
* Attachments

---

# Patient Portal

THERASSISTANT EHR includes a patient portal for client-facing workflows.

The patient portal may support:

* Demographic review
* Insurance updates
* Consent forms
* Intake forms
* Secure messages
* Invoices
* Payment plans
* Payment history
* Appointment information
* Pre-session check-ins
* In-Between Session Journal
* Client-facing progress reflection tools
* Clinical document access when permitted

The portal should help clients participate in their care while protecting clinical, financial, and administrative information.

---

# Pre-Session Dashboard

THERASSISTANT EHR includes a planned **Pre-Session Dashboard** to help therapists quickly prepare before each client session.

The dashboard provides a simple clinical snapshot so providers can review the most important information without searching through multiple areas of the chart.

The Pre-Session Dashboard is separate from billing-focused Pre-Session Review.

* **Pre-Session Dashboard** = clinical preparation for the provider.
* **Pre-Session Review** = eligibility, benefits, authorization, balance, and administrative readiness.

## Purpose

The Pre-Session Dashboard helps providers answer one question:

**What do I need to know before starting this session?**

The dashboard supports better continuity of care by connecting the client’s current concerns, recent progress, active treatment goals, prior session plan, journal updates, check-in responses, and relevant safety information in one place.

## Pre-Session Client Check-In

Before an appointment, clients may complete a short check-in through the client portal.

The check-in may ask:

* What would you like to focus on today?
* How would you rate your overall distress since your last session?
* Are there any safety concerns today?
* Which treatment goal would you like to work on?
* Is there anything important you want your provider to know before the session?

Client responses are made available to the provider before the session begins.

## Provider View

The provider may review key session-preparation details, including:

* The client’s stated focus for the session
* Recent distress rating
* Reported safety concerns
* Active treatment plan goal connected to the session
* Plan or next steps from the previous session note
* Recent progress or barriers reported by the client
* Recent journal entries shared by the client
* Relevant reminders from the chart

This helps the provider quickly reorient to the client’s needs and maintain alignment with the treatment plan.

## Treatment Goal Alignment

The Pre-Session Dashboard helps maintain the clinical connection between the session and the client’s active treatment plan.

Clients may select an existing treatment goal or submit a brief progress update before the session.

Client-submitted updates do not automatically change the official treatment plan. They are shown to the provider for review. The provider remains responsible for reviewing, editing, approving, and documenting any clinical changes.

## Progress Note Support

When a provider begins a session, relevant client check-in responses may be available for use in the progress note.

Client-submitted information should be clearly labeled so the provider can distinguish it from provider-authored documentation.

The provider can edit, expand, or remove any imported information before signing the note.

## Safety Review

If a client reports a safety concern during the pre-session check-in, the dashboard should clearly flag the response for provider review.

This feature is intended to support clinical awareness and reduce the risk of missed client-reported concerns. It does not replace provider judgment, crisis protocols, mandated reporting duties, or required clinical decision-making.

## Audit Trail

THERASSISTANT EHR should maintain an audit trail for important clinical actions related to the Pre-Session Dashboard, including:

* Client check-in submissions
* Provider review of client-submitted updates
* Treatment goal updates
* Imported client responses used in progress notes
* Provider approval, rejection, or modification of proposed updates
* Safety concern review
* Date and time the provider reviewed the pre-session information

## Design Goal

The Pre-Session Dashboard should remain simple, fast, and clinically useful.

It is not intended to replace chart review or provider judgment. It is intended to give therapists a focused starting point before each session begins.

---

# In-Between Session Journal

THERASSISTANT EHR includes an **In-Between Session Journal** in the patient portal.

The journal allows clients to record thoughts, concerns, symptoms, progress, barriers, reflections, or updates between appointments. Providers can review shared journal entries and may import relevant client-submitted content into progress notes after review.

The journal is designed to support continuity of care without blurring the line between client-submitted content and provider-authored clinical documentation.

## Purpose

The In-Between Session Journal helps clients capture important thoughts and experiences as they happen instead of waiting until the next appointment.

It helps providers understand what happened between sessions and may support better treatment planning, session focus, and progress note documentation.

## Client Journal Use

Clients may use the journal to document:

* Current concerns
* Mood changes
* Stressors
* Symptoms
* Progress toward goals
* Barriers to progress
* Coping skills used
* Medication-related observations
* Questions for the provider
* Events they want to discuss in session
* Reflections after a previous session

## Goal-Connected Journaling

Journal entries may optionally connect to:

* A treatment plan goal
* A current objective
* A coping skill
* A symptom area
* A session focus
* A provider-assigned reflection prompt

This helps connect client engagement to the Golden Thread.

## Provider Review

Providers may review journal entries before or during a session.

The provider view may show:

* Recent shared journal entries
* Entries linked to treatment goals
* Entries flagged by the client as important
* Entries with safety-related responses
* Entries the client wants to discuss
* Entries selected for possible note import

## Importing Journal Content Into Notes

Provider-reviewed journal content may be imported into a progress note.

Imported journal content should be:

* Clearly labeled as client-submitted content
* Editable by the provider
* Removable by the provider
* Not automatically signed into the record
* Subject to provider review and approval
* Audited when imported into clinical documentation

The provider remains responsible for the final signed clinical note.

## Clinical Safeguards

Journal entries should not automatically modify:

* Diagnoses
* Treatment plan goals
* Treatment plan objectives
* Risk level
* Safety plan
* Progress note content
* Billing codes
* Medical necessity documentation

Client-submitted information may inform provider judgment, but provider review is required before it becomes part of signed clinical documentation.

## Safety-Related Journal Entries

If a journal entry contains safety-related responses or crisis indicators, the system should clearly flag the entry for provider review.

This feature supports clinical awareness. It does not replace emergency services, crisis protocols, mandated reporting duties, safety planning, or provider judgment.

## Audit Trail

THERASSISTANT EHR should audit important journal actions, including:

* Client journal submission
* Client edit or deletion when permitted
* Provider review
* Provider import into a note
* Provider modification of imported content
* Provider removal of imported content
* Safety flag review
* Treatment goal linkage
* Date and time of review

## Design Goal

The In-Between Session Journal should feel simple and approachable for clients while remaining clinically controlled for providers.

It should help clients remember what matters, help providers prepare, and support documentation without allowing unreviewed client text to become provider-authored clinical documentation.

---

# Pre-Session Review

THERASSISTANT EHR includes **Pre-Session Review** for administrative and billing readiness before an appointment.

This feature is separate from the clinical Pre-Session Dashboard.

Pre-Session Review helps staff identify billing, eligibility, authorization, balance, and administrative issues before the client is seen.

## Pre-Session Review May Include

* Eligibility verification
* Benefits review
* Copay verification
* Deductible verification
* Coinsurance verification
* Out-of-pocket review
* Authorization check
* Coverage active/inactive review
* In-network status review
* Client balance review
* Missing insurance review
* Missing diagnosis warning
* Missing authorization warning
* Required form review
* Notes to provider or front desk
* Internal task routing

## Purpose

The goal is to catch billing and administrative issues before the session occurs.

Pre-Session Review helps prevent avoidable denials, missed copays, inactive coverage problems, authorization issues, and incomplete client account information.

---

# Scheduling

Scheduling features may include:

* Appointments
* Recurring appointments
* Provider schedules
* Location assignment
* Appointment statuses
* No-show tracking
* Cancellation tracking
* Visit readiness indicators
* Pre-Session Dashboard access
* Pre-Session Review indicators

---

# Eligibility and Benefits

Eligibility and benefits features include:

* Eligibility verification
* Day-before benefits checks
* Copay verification
* Deductible verification
* Coinsurance verification
* Out-of-pocket tracking
* Active coverage dates
* In-network status
* Authorization requirements
* Reference numbers
* Payer portal notes
* Verification history

---

# Authorizations

Authorization features include:

* Authorization records
* Authorization numbers
* Approved services
* Approved units
* Used units
* Remaining units
* Effective dates
* Expiration dates
* Authorization warnings
* Authorization-linked claims
* Authorization-linked charges
* Authorization document links

---

# Clinical Documentation

THERASSISTANT EHR supports behavioral health clinical documentation workflows.

Documentation types may include:

* Intake note
* Biopsychosocial assessment
* Diagnostic evaluation
* Mental health assessment
* Substance use assessment
* Treatment plan
* Treatment plan review
* Progress note
* Crisis note
* Group note
* Case management note
* Peer support note
* Skills training note
* Discharge summary
* Administrative note
* Non-clinical account note

## Golden Thread Support

The system should help clinicians maintain the Golden Thread across:

* Assessment
* Diagnosis
* Treatment plan
* Goals
* Objectives
* Interventions
* Progress notes
* Medical necessity
* Discharge planning

Progress notes should connect back to treatment goals and support billing requirements.

## Documentation Sources

Progress notes may include provider-reviewed information from:

* Provider-authored session documentation
* Client pre-session check-in responses
* Client In-Between Session Journal entries
* Prior session plan or next steps
* Treatment goal progress
* Safety review notes

Client-submitted content should always remain clearly labeled until reviewed, edited, and approved by the provider.

---

# Medicaid Behavioral Health Coding Support

THERASSISTANT EHR is designed to support Colorado behavioral health coding workflows.

The system may help identify and validate services such as:

* `90791` diagnostic evaluation
* `90832` psychotherapy, 30 minutes
* `90834` psychotherapy, 45 minutes
* `90837` psychotherapy, 60 minutes
* `90839` crisis psychotherapy
* `90840` crisis add-on
* `90785` interactive complexity
* `90853` group psychotherapy
* `H0031` mental health assessment
* `H0032` treatment plan development/review
* `H0001` alcohol and/or drug assessment
* `H0002` behavioral health screening
* `H0034` skills-related or payer-defined support service
* `H2014` skills training and development
* `T1017` targeted case management
* `H0038` peer support
* `H2011` crisis intervention
* `H2017` community-based support
* `H0023` outreach
* `H0025` prevention
* `S9445` education service

The system should support payer-specific coding rules, unit rules, documentation rules, provider credential restrictions, authorization requirements, and claim readiness checks.

---

# Documentation-to-Billing Validation

Before a charge becomes claim-ready, the system should validate:

* Client is active
* Insurance coverage exists
* Provider is active
* Provider is credentialed or enrolled when required
* Diagnosis is present
* CPT/HCPCS code is valid
* Modifier is valid when required
* Place of service is valid
* Authorization exists when required
* Documentation supports the billed service
* Time-based codes include required time
* Treatment goal is referenced when required
* Units are valid
* Service date is within coverage and authorization windows

---

# Charge Capture

The charge capture module converts documented services into billable charges.

Charge records may include:

* Client
* Practice
* Provider
* Rendering provider
* Supervising provider
* Billing provider
* Service date
* CPT/HCPCS code
* Modifiers
* Diagnosis pointers
* Units
* Place of service
* Fee
* Expected reimbursement
* Authorization link
* Documentation link
* Claim status
* Billing status
* Hold reason
* Review reason

## Charge Capture Workqueue

The charge capture workqueue should surface:

* Missing diagnosis
* Missing documentation
* Missing provider
* Missing authorization
* Invalid CPT/modifier combination
* Missing place of service
* Missing payer
* Missing fee schedule
* Provider not credentialed
* Service outside authorization period
* Service outside coverage period
* Service not ready to bill

---

# Claims Management

THERASSISTANT EHR tracks claims from creation through final resolution.

Claim statuses may include:

* Draft
* Ready to submit
* Submitted
* Accepted
* Rejected
* Denied
* Pending payer response
* Partially paid
* Paid
* Appealed
* Corrected
* Voided
* Reversed
* Written off
* Closed

## Claims Data

Claims may include:

* Claim header
* Claim lines
* Client
* Payer
* Billing provider
* Rendering provider
* Supervising provider
* Practice
* Service location
* Diagnosis codes
* CPT/HCPCS codes
* Modifiers
* Units
* Charges
* Claim control number
* Clearinghouse trace
* Payer claim number
* Submission history
* Response history
* Denial history
* Payment history
* Linked Mailroom documents

## Claim Batches

Claim batches support grouped submission and tracking.

Batch functionality may include:

* Batch header
* Batch item records
* Submission timestamp
* Clearinghouse response
* Payer response
* Accepted claims
* Rejected claims
* Failed claims
* Resubmission tracking
* Batch audit trail

---

# Payment Posting

THERASSISTANT EHR supports detailed payment posting.

Payment posting types include:

* ERA posting
* EOB posting
* Manual insurance payment posting
* Manual client payment posting
* Zero-pay posting
* Denial posting
* Adjustment posting
* Reversal posting
* Refund posting
* Credit transfer posting

Payment posting features should support:

* Insurance payment amounts
* Client payment amounts
* Contractual adjustments
* Client responsibility transfers
* Deductible amounts
* Copay amounts
* Coinsurance amounts
* Non-covered amounts
* Denial CARCs/RARCs
* Partial payments
* Overpayments
* Underpayments
* Reversals
* Ledger posting
* Claim balance updates
* Client balance updates
* Linked EOBs and remittance documents from Mailroom

---

# Historical Payment Posting

THERASSISTANT EHR includes a historical payment posting feature.

This allows users to post financial activity even when no claim exists in the system.

Historical posting supports:

* Opening balances
* Prior insurance payments
* Prior client payments
* Prior credits
* Prior refunds
* Prior contractual adjustments
* Prior write-offs
* Prior client balances
* Imported ledger history

This prevents practices from having to recreate old claims just to preserve financial history.

Historical transactions post directly to the ledger and can be associated with:

* Client
* Practice
* Provider
* Payer
* Service date
* Transaction date
* Transaction type
* Amount
* Notes
* Source system
* Import batch
* Supporting document from Mailroom

---

# Ledger

The ledger is the financial source of truth for client account activity.

Ledger entries may include:

* Charges
* Insurance payments
* Client payments
* Adjustments
* Refunds
* Credits
* Credit transfers
* Write-offs
* Reversals
* Historical transactions

Each ledger transaction should include:

* Client
* Practice
* Tenant
* Transaction type
* Transaction date
* Service date when applicable
* Amount
* Claim link when applicable
* Payment link when applicable
* Invoice link when applicable
* Mailroom document link when applicable
* Source module
* Created by
* Audit trail

---

# Mailroom

THERASSISTANT EHR includes **Mailroom**, a document upload, routing, indexing, filing, and retrieval system for provider paper mail, payer correspondence, scanned records, and other practice documents.

Mailroom is not just file storage. It is a structured document repository and routing system where documents can be uploaded, indexed, routed, reviewed, linked, filed, searched, retained, and audited.

Mailroom should work like an enterprise filing system. Providers should be able to upload mail without knowing exactly where it belongs, and billers should be able to review, classify, route, link, and file it into the correct record.

## Mailroom Purpose

Mailroom allows providers and practice staff to upload paper mail or scanned documents and route them to the correct biller, credentialing specialist, administrator, or workqueue.

Mailroom helps prevent important payer mail, refund notices, denial letters, EOBs, credentialing notices, authorization documents, and contract notices from getting lost in email, screenshots, downloads, or disconnected folders.

## Common Mailroom Documents

Common uploaded documents may include:

* Payer letters
* EOBs
* Denial letters
* Appeal letters
* Authorization letters
* Credentialing notices
* Contract notices
* Refund requests
* Overpayment letters
* Medical record requests
* Client forms
* Paper claims
* Paper remittance documents
* Legal notices
* Compliance correspondence
* Insurance cards
* Intake paperwork
* Signed documents
* Miscellaneous practice mail

## Mailroom Workflow

The Mailroom workflow may include:

1. Provider or staff uploads paper mail.
2. Document is assigned to a practice, provider, client, payer, or claim when known.
3. Document is categorized by type.
4. Metadata is added.
5. Document is routed to the correct user or workqueue.
6. Biller reviews the document.
7. Document is linked to the correct record.
8. Follow-up task is created if action is needed.
9. Document is filed into the permanent repository.
10. Audit history is preserved.

## Mailroom Routing

Documents can be routed to:

* Assigned biller
* Credentialing staff
* Practice admin
* AR follow-up workqueue
* Denial workqueue
* Payment posting workqueue
* Refund review workqueue
* Authorization workqueue
* Client chart
* Provider file
* Payer file
* Claim record
* Client ledger
* Credentialing record
* Contract record

## Mailroom Filing and Linking

Uploaded documents should be able to link to one or more system records.

A single document may be linked to:

* Tenant
* Practice
* Billing company
* Provider
* Client
* Payer
* Insurance policy
* Authorization
* Charge
* Claim
* Claim line
* Payment
* Ledger transaction
* Invoice
* Refund request
* Credentialing record
* Contract record
* Workqueue item
* Task
* Communication log

This allows the same document to be filed once but referenced from every relevant part of the system.

## Mailroom Metadata

Documents should support structured metadata so they can be searched, filtered, routed, and filed correctly.

Example metadata fields include:

* Document title
* Document type
* Document category
* Source
* Upload date
* Received date
* Scanned date
* Document date
* Due date
* Payer
* Client
* Provider
* Practice
* Claim number
* Payer claim number
* Authorization number
* Invoice number
* Check number
* EFT trace number
* Amount
* Service date
* Date range
* Assigned user
* Routing status
* Filing status
* Priority
* Tags
* Notes

## Mailroom Statuses

Mailroom statuses may include:

* Uploaded
* Needs review
* Needs indexing
* Routed
* Assigned
* In progress
* Needs more information
* Filed
* Linked
* Rejected
* Archived
* Deleted
* Retention hold
* Ready for destruction

## Mailroom Search and Retrieval

Mailroom should support search and retrieval by:

* Client
* Provider
* Payer
* Claim
* Authorization
* Document type
* Received date
* Uploaded date
* Assigned user
* Routing status
* Tags
* Metadata
* Notes
* Full-text document contents when OCR is available

## OCR and Indexing

Future OCR features may allow the system to extract useful information from uploaded documents, including:

* Client name
* Provider name
* Payer name
* Claim number
* Authorization number
* Check number
* Payment amount
* Denial reason
* Dates of service
* Due dates
* Reference numbers

OCR should assist users, not silently overwrite important billing or clinical data without review.

## Mailroom Workqueues

Mailroom should generate or attach to workqueue items when action is needed.

Example Mailroom workqueues include:

* Unfiled documents
* Unindexed documents
* Documents needing biller review
* Denial letters needing action
* EOBs needing payment posting
* Refund requests needing review
* Credentialing mail needing follow-up
* Authorization letters needing update
* Medical record requests needing response
* Documents missing required metadata

## Mailroom Audit Trail

Every important Mailroom action should be audited.

Audit history should track:

* Who uploaded the document
* Who viewed the document
* Who routed the document
* Who changed metadata
* Who linked the document
* Who downloaded the document
* Who archived the document
* Who deleted the document
* Previous and new routing status
* Previous and new filing status
* Timestamp
* Tenant and practice context

## Mailroom Security and Access

Mailroom access should follow tenant, practice, provider, client, clinical, and financial permissions.

Access rules should support:

* Tenant isolation
* Practice-level access
* Billing company scoped access
* Provider-specific access
* Clinical document restrictions
* Financial document restrictions
* Credentialing document restrictions
* Patient portal restrictions
* Admin-only document categories

## Mailroom Retention and Records Management

Mailroom should support records management concepts, including:

* Document retention categories
* Retention periods
* Legal holds
* Archive status
* Destruction eligibility
* Destruction approval
* Permanent records
* Audit-preserved deletion records

---

# Denial Management

THERASSISTANT EHR includes denial and AR workflows.

Denial features include:

* CARC/RARC tracking
* Denial category
* Denial reason
* Denial owner
* Follow-up due date
* Corrected claim workflow
* Reconsideration workflow
* Appeal workflow
* Write-off workflow
* Credentialing denial identification
* Contract denial identification
* Timely filing tracking
* Supporting document tracking
* Denial notes
* Denial outcomes
* Linked denial letters from Mailroom

## Credentialing and Contract Denials

Credentialing and contract-related denials should be clearly identified.

Examples may include:

* Provider not credentialed
* Provider not enrolled
* Provider not effective on date of service
* Contract not active
* Payer participation issue
* Out-of-network issue
* Billing provider mismatch
* Rendering provider mismatch

The system should allow organizations to define whether these denials are worked, escalated, or written off based on internal policy.

---

# AR Follow-Up

The AR module should support:

* Claim status checks
* Payer follow-up notes
* Payer reference numbers
* Follow-up due dates
* Aging buckets
* Assigned user
* Workqueue status
* Escalation status
* Next action
* Resolution reason
* Linked Mailroom documents

AR aging should support:

* 0–30 days
* 31–60 days
* 61–90 days
* 91–120 days
* 120+ days

---

# Client Responsibility and Patient Billing

THERASSISTANT EHR supports client balance workflows.

Client responsibility items include:

* Copay
* Deductible
* Coinsurance
* Non-covered services
* Self-pay balances
* Prior balances
* Transferred balances

Patient billing features may include:

* Client invoices
* Invoice lines
* Invoice delivery logs
* Portal invoices
* Mailed invoice tracking
* Email invoice tracking
* Payment plans
* Installments
* Autopay status
* Collections status
* Hardship applications
* Credit balances
* Refund requests
* Refund approvals
* Refund payments
* Credit transfers

---

# Refunds and Credits

Refund and credit workflows include:

* Client credit balance
* Payer overpayment
* Overpayment review
* Refund request
* Refund approval
* Refund denial
* Refund payment
* Credit transfer
* Ledger reversal
* Audit trail
* Linked refund or overpayment documents from Mailroom

---

# Payer Management

Payer features include:

* Payer profiles
* Payer IDs
* Plan names
* Product types
* Portal links
* Claims address
* Eligibility method
* Claim submission method
* ERA/EFT setup
* Payer notes
* Payer-specific rules
* Timely filing limits
* Appeal limits
* Corrected claim rules
* Reconsideration rules
* Payer document file

---

# Payer Rates and Fee Schedules

THERASSISTANT EHR supports payer rate intelligence.

Rate features may include:

* Payer fee schedules
* CPT-level rates
* Modifier-specific rates
* Effective periods
* Termination dates
* Expected reimbursement rules
* Contracted rate comparison
* Underpayment detection
* Overpayment detection
* Payer variance review
* Average reimbursement reports
* Linked contract and fee schedule documents from Mailroom

---

# Credentialing and Enrollment

Credentialing features may include:

* Provider enrollment records
* Payer applications
* CAQH tracking
* Medicaid enrollment
* Medicare enrollment
* Commercial payer enrollment
* Contracting status
* Effective dates
* Revalidation dates
* Missing documentation
* Application notes
* Payer follow-up
* Credentialing task tracking
* Linked credentialing documents from Mailroom

Credentialing data should connect to claim readiness and denial prevention.

---

# Workqueues

THERASSISTANT EHR is workqueue-driven.

Potential workqueues include:

* Pre-Session Review issues
* Pre-Session Dashboard safety flags
* Client journal entries needing provider review
* Eligibility issues
* Authorization issues
* Documentation incomplete
* Charge review
* Claim errors
* Claim rejections
* Denials
* AR follow-up
* Payment posting exceptions
* Client balance review
* Refund review
* Credentialing issues
* Contracting issues
* Mailroom review
* Unfiled Mailroom documents
* Imports requiring validation
* Integration errors
* Tasks assigned to user

Each workqueue item may include:

* Priority
* Assigned user
* Practice
* Provider
* Client
* Claim
* Document
* Due date
* Status
* Reason
* Next action
* Notes
* Audit trail

---

# Notes and Communication

THERASSISTANT EHR supports multiple note and communication types.

Examples include:

* Account notes
* Claim notes
* Payment notes
* Admin notes
* Task notes
* Communication logs
* Payer call notes
* Client contact notes
* Portal messages
* Internal messages
* Mailroom document notes
* Client journal entries
* Pre-session check-in responses

Communication features may include:

* Message threads
* Message attachments
* Client messages
* Staff messages
* In-app notifications
* Email notifications
* SMS notifications
* Delivery tracking

---

# Reporting

THERASSISTANT EHR should include operational, financial, document, clinical-support, and compliance reporting.

Potential reports include:

* Daily flash report
* Month-end report
* Claims submitted
* Claims rejected
* Claims denied
* Payments posted
* AR aging
* AR over 90 days
* Denial analysis
* Payer mix
* Provider productivity
* Reimbursement by CPT
* Expected vs actual reimbursement
* Underpayment report
* Overpayment report
* Client balance report
* Credit balance report
* Refund report
* Clean claim rate
* First-pass yield
* Net collection rate
* Gross collection rate
* Patient collection rate
* Authorization utilization
* Credentialing issue report
* Workqueue productivity
* Mailroom volume
* Mailroom turnaround time
* Unfiled document report
* Documents by payer
* Documents by provider
* Documents by practice
* Documents pending review
* Documents pending retention review
* Pre-session check-in completion
* Journal usage
* Journal entries reviewed
* Journal entries imported into notes

---

# Imports

THERASSISTANT EHR supports structured imports.

Import-related tables may include:

* `import_batches`
* `import_files`
* `import_rows`
* `import_validation_errors`
* `import_mappings`
* `import_commits`
* `import_rollbacks`

Supported import use cases may include:

* Clients
* Providers
* Insurance policies
* Claims
* Payments
* Ledger history
* Fee schedules
* Payer rates
* Authorizations
* Prior balances
* Historical transactions
* Document metadata
* Legacy document files

---

# Integrations

Integration architecture may include:

* `integration_connections`
* `integration_credentials`
* `integration_sync_jobs`
* `integration_sync_errors`
* `external_system_mappings`
* `webhook_events`
* `outbound_webhook_deliveries`

Potential integrations include:

* Gmail
* Google Calendar
* Clearinghouses
* Payer portals
* Payment processors
* EHR imports
* Accounting systems
* Notification services
* External reporting tools
* Document OCR services

## Gmail Integration Concept

THERASSISTANT EHR may support per-clinician or per-practice Gmail integrations.

Potential Gmail features include:

* Practice-specific email connection
* User-specific OAuth connection
* Isolated mailbox access
* Email-to-client communication log
* Email-to-task conversion
* Email attachments to client chart
* Email attachments to Mailroom
* Payer email tracking
* Credentialing email tracking

Access should be scoped so one user’s Gmail connection does not expose unrelated email data.

---

# Notifications

Notification features include:

* In-app notifications
* Notification preferences
* Notification delivery records
* Email delivery records
* SMS delivery records
* Push delivery records
* Notification templates

Notification use cases may include:

* Missing documentation
* Upcoming authorization expiration
* Claim rejection
* Denial assigned
* AR follow-up due
* Payment posting exception
* Refund approval needed
* Credentialing follow-up due
* Client message received
* Client check-in submitted
* Journal entry shared
* Safety concern flagged
* Mailroom document assigned
* Mailroom document missing metadata
* Mailroom document overdue for review
* Import validation failed

---

# Audit Logging

Audit logging is a core system requirement.

Audit logs should track:

* Actor
* Tenant
* Practice
* Target object type
* Target object ID
* Action
* Previous value
* New value
* Previous status
* New status
* Timestamp
* IP/device metadata when available
* Supporting metadata

Important audited actions include:

* Claim status changes
* Payment posting
* Ledger transactions
* Refunds
* Credits
* Write-offs
* Role changes
* Tenant access changes
* Clinical documentation edits
* Client demographic changes
* Insurance changes
* Payer changes
* Fee schedule changes
* Credentialing changes
* Client check-in submissions
* Provider review of check-ins
* Client journal submissions
* Provider review of journal entries
* Journal content imported into notes
* Client-submitted content modified or removed from notes
* Safety flag review
* Mailroom uploads
* Mailroom routing
* Mailroom metadata changes
* Mailroom filing and linking
* Mailroom viewing, downloading, archiving, and deletion
* Import commits and rollbacks

---

# Database Design

The database should be designed around clear domains, strong relationships, tenant isolation, and minimal duplicate source-of-truth tables.

## Tenant and Access Tables

* `tenants`
* `tenant_memberships`
* `roles`
* `permissions`
* `user_profiles`
* `practice_access`
* `billing_company_practice_links`

## Practice Tables

* `practices`
* `billing_entities`
* `locations`
* `facilities`
* `practice_settings`

## Provider Tables

* `providers`
* `provider_credentials`
* `provider_payer_enrollments`
* `provider_licenses`
* `provider_taxonomy_records`
* `supervising_provider_relationships`

## Client Tables

* `clients`
* `client_contacts`
* `responsible_parties`
* `insurance_policies`
* `coverage_history`
* `client_notes`
* `client_messages`
* `client_attachments`

## Patient Portal and Journal Tables

* `patient_portal_accounts`
* `portal_messages`
* `pre_session_check_ins`
* `pre_session_check_in_responses`
* `pre_session_safety_flags`
* `client_journal_entries`
* `client_journal_prompts`
* `client_journal_goal_links`
* `client_journal_review_logs`
* `client_journal_note_imports`

## Clinical Tables

* `assessments`
* `treatment_plans`
* `progress_notes`
* `crisis_notes`
* `group_notes`
* `case_management_notes`
* `peer_support_notes`
* `documentation_templates`
* `goals`
* `objectives`
* `interventions`

## Billing Tables

* `charges`
* `claims`
* `claim_lines`
* `claim_batches`
* `claim_batch_items`
* `claim_notes`
* `claim_status_history`

## Payment and Ledger Tables

* `payments`
* `payment_lines`
* `adjustments`
* `ledger_transactions`
* `historical_transactions`
* `credit_balances`
* `refund_requests`
* `refund_approvals`
* `refund_payments`
* `credit_transfers`
* `overpayment_reviews`

## Patient Billing Tables

* `client_responsibility_items`
* `client_invoices`
* `invoice_lines`
* `invoice_delivery_logs`
* `payment_plans`
* `payment_plan_installments`
* `collections_status_history`
* `hardship_applications`

## Payer and Rate Tables

* `payer_profiles`
* `payer_rates`
* `cpt_fee_schedules`
* `cpt_fee_schedule_lines`
* `expected_reimbursement_rules`
* `payer_effective_periods`
* `payer_variance_reviews`

## Mailroom Tables

Mailroom may require tables such as:

* `mailroom_items`
* `mailroom_assignments`
* `mailroom_routes`
* `mailroom_route_history`
* `mailroom_workqueue_items`
* `documents`
* `document_versions`
* `document_files`
* `document_types`
* `document_categories`
* `document_tags`
* `document_tag_links`
* `document_metadata`
* `document_links`
* `document_tasks`
* `document_access_logs`
* `document_audit_logs`
* `document_retention_rules`
* `document_retention_holds`
* `document_ocr_results`
* `document_folders`
* `document_folder_items`

## Reference Tables

* `cpt_codes`
* `cpt_code_rules`
* `modifier_codes`
* `diagnosis_codes`
* `place_of_service_codes`
* `taxonomy_codes`
* `carc_codes`
* `rarc_codes`

## Import and Integration Tables

* `import_batches`
* `import_files`
* `import_rows`
* `import_validation_errors`
* `import_mappings`
* `import_commits`
* `import_rollbacks`
* `integration_connections`
* `integration_credentials`
* `integration_sync_jobs`
* `integration_sync_errors`
* `external_system_mappings`
* `webhook_events`
* `outbound_webhook_deliveries`

## Notification Tables

* `notifications`
* `notification_preferences`
* `notification_deliveries`
* `notification_templates`

## Audit Tables

* `audit_logs`
* `status_history`
* `access_logs`

---

# Supabase Architecture

THERASSISTANT EHR uses Supabase as the backend platform.

Supabase may provide:

* PostgreSQL database
* Authentication
* Row-Level Security
* Storage
* Edge Functions
* RPC functions
* Realtime subscriptions
* Service role operations for trusted backend workflows

---

# Row-Level Security

RLS policies should enforce:

* Tenant isolation
* Practice isolation
* Billing company scoped access
* User role permissions
* Clinician access limits
* Financial data restrictions
* Clinical data restrictions
* Mailroom document restrictions
* Patient portal restrictions
* Platform admin oversight

Important access helper functions may include:

```sql
get_current_user_id()
get_current_tenant_id()
user_has_tenant_access(user_id, tenant_id)
user_has_role(user_id, tenant_id, role_name)
user_can_access_practice(user_id, practice_id)
user_can_manage_billing(user_id, practice_id)
user_can_view_clinical_record(user_id, client_id)
user_can_view_financials(user_id, client_id)
user_can_access_mailroom_document(user_id, document_id)
user_can_review_client_journal(user_id, client_id)
link_billing_company_to_practice(billing_company_id, practice_id)
unlink_billing_company_from_practice(billing_company_id, practice_id)
```

---

# Frontend Architecture

The frontend should be modular and domain-driven.

Suggested structure:

```text
src/
  app/
  components/
  hooks/
  lib/
  modules/
  pages/
  services/
  types/
  utils/
```

## Utilities

Utilities should handle reusable logic such as:

* Date formatting
* Currency formatting
* CPT validation
* Claim status mapping
* CARC categorization
* Ledger calculations
* Role checks
* Permission helpers
* Form validation
* Payer rule helpers
* Mailroom status mapping
* Document type mapping
* Document metadata validation
* Document link validation
* Journal entry status mapping
* Client-submitted content labeling
* Safety flag detection helpers

## Services

Services should handle business logic and Supabase calls.

Example services:

* AuthService
* TenantService
* PracticeService
* ProviderService
* ClientService
* PatientPortalService
* PreSessionDashboardService
* PreSessionReviewService
* PreSessionCheckInService
* ClientJournalService
* JournalReviewService
* EligibilityService
* AuthorizationService
* DocumentationService
* ChargeService
* ClaimService
* ClaimBatchService
* PaymentPostingService
* LedgerService
* DenialService
* ARService
* InvoiceService
* RefundService
* PayerService
* CredentialingService
* MailroomService
* DocumentService
* DocumentRoutingService
* DocumentFilingService
* DocumentSearchService
* DocumentMetadataService
* DocumentRetentionService
* DocumentOCRService
* DocumentAuditService
* ImportService
* IntegrationService
* NotificationService
* AuditLogService
* WorkflowService

## Hooks

Hooks should provide reusable frontend state and data access.

Example hooks:

* `useAuth`
* `useTenant`
* `usePractice`
* `useProvider`
* `useClient`
* `usePatientPortal`
* `usePreSessionDashboard`
* `usePreSessionReview`
* `usePreSessionCheckIn`
* `useClientJournal`
* `useJournalReview`
* `useEligibility`
* `useAuthorizations`
* `useCharges`
* `useClaims`
* `useClaimBatches`
* `usePayments`
* `useLedger`
* `useDenials`
* `useWorkqueues`
* `useMailroom`
* `useMailroomQueue`
* `useDocuments`
* `useDocumentUpload`
* `useDocumentSearch`
* `useDocumentTypes`
* `useDocumentMetadata`
* `useDocumentRoutes`
* `useDocumentLinks`
* `useDocumentAudit`
* `useNotifications`
* `usePermissions`
* `useReports`

## Modules

Modules should group complete business areas.

Example modules:

* Auth
* Dashboard
* Tenants
* Practices
* Providers
* Clients
* Patient Portal
* Scheduling
* Pre-Session Dashboard
* Pre-Session Review
* In-Between Session Journal
* Eligibility
* Authorizations
* Documentation
* Charge Capture
* Claims
* Payment Posting
* Ledger
* Mailroom
* Denials
* AR Follow-Up
* Patient Billing
* Refunds
* Payers
* Credentialing
* Imports
* Integrations
* Notifications
* Reports
* Settings
* Audit Logs

---

# Suggested Pages

## Core Pages

* Dashboard
* Clients
* Client Detail
* Providers
* Provider Detail
* Practices
* Practice Settings
* Billing Company Settings
* Scheduling
* Eligibility
* Authorizations
* Documentation
* Charges
* Claims
* Claim Detail
* Claim Batches
* Payment Posting
* Ledger
* Denials
* AR Follow-Up
* Client Billing
* Refunds and Credits
* Payers
* Fee Schedules
* Credentialing
* Reports
* Settings
* Audit Logs

## Clinical and Portal Pages

* Patient Portal
* Client Check-In
* In-Between Session Journal
* Journal Entry Detail
* Journal Review
* Pre-Session Dashboard
* Provider Session Prep
* Safety Flag Review
* Goal Alignment Review
* Progress Note Draft

## Billing and Admin Pages

* Pre-Session Review
* Eligibility Review
* Authorization Review
* Charge Capture Workqueue
* Claim Error Workqueue
* Denial Workqueue
* AR Follow-Up Workqueue
* Refund Review Workqueue
* Credentialing Workqueue

## Mailroom Pages

* Mailroom
* Upload Document
* Unfiled Documents
* Document Review
* Document Detail
* Document Repository
* Document Search
* Document Routing Queue
* Document Retention
* Provider Documents
* Client Documents
* Claim Documents
* Payer Documents
* Credentialing Documents
* Mailroom Workqueues

---

# Suggested Build Order

A practical build order:

1. Database schema
2. Enums
3. Reference tables
4. Tenant and role tables
5. Supabase RLS helper functions
6. Row-Level Security policies
7. Supabase Storage buckets
8. Supabase client setup
9. Authentication
10. Tenant switching
11. Practice and billing company linking
12. Providers
13. Clients
14. Insurance policies
15. Patient portal foundation
16. Pre-Session Review
17. Pre-Session Dashboard
18. In-Between Session Journal
19. Eligibility and benefits
20. Authorizations
21. Documentation
22. Charge capture
23. Claims
24. Claim batches
25. Payment posting
26. Ledger
27. Historical payment posting
28. Mailroom upload and storage
29. Mailroom routing
30. Mailroom filing and document linking
31. Mailroom search and metadata
32. Mailroom audit logs
33. Denials
34. AR workqueues
35. Client responsibility
36. Invoices
37. Refunds and credits
38. Payer profiles
39. Fee schedules and expected reimbursement
40. Credentialing
41. Imports
42. Integrations
43. Notifications
44. Reporting
45. Audit logs
46. Admin settings

---

# Environment Variables

Create a `.env.local` file for local development.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_BASE_URL=
```

Additional environment variables may be needed for integrations:

```env
GMAIL_OAUTH_STATE_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

PAYMENT_PROCESSOR_SECRET=
CLEARINGHOUSE_API_KEY=
NOTIFICATION_SERVICE_KEY=
OCR_SERVICE_KEY=
DOCUMENT_STORAGE_BUCKET=
```

---

# Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local app:

```text
http://localhost:3000
```

---

# Compliance Considerations

THERASSISTANT EHR is intended for healthcare and behavioral health operations. The system should be designed with HIPAA-aware safeguards.

Important safeguards include:

* Role-based access
* Tenant isolation
* Minimum necessary access
* Audit logs
* Secure authentication
* Encrypted secrets
* Secure file storage
* Secure document routing
* Secure integrations
* Clinical record access controls
* Financial record access controls
* Mailroom document access controls
* Patient portal protections
* Client-submitted content controls
* Provider review before clinical note signing
* Backup and recovery planning
* Document retention planning

This README is a product and technical overview. It is not legal, compliance, clinical, or billing advice.

---

# Current Development Focus

Current development priorities include:

* Finalizing database tables
* Removing unnecessary duplicate tables
* Defining foreign keys
* Creating Supabase enums
* Building tenant access functions
* Configuring billing company to practice relationships
* Building RLS policies
* Structuring services, hooks, utilities, pages, and modules
* Creating workqueue logic
* Building Pre-Session Dashboard
* Building Pre-Session Review
* Building In-Between Session Journal
* Building claim lifecycle workflows
* Building payment posting workflows
* Supporting historical ledger posting
* Building Mailroom upload, routing, filing, search, and linking
* Building payer and fee schedule intelligence
* Designing reports
* Creating clean UI layouts for clinical, billing, Mailroom, and patient portal workflows

---

# Long-Term Roadmap

Future roadmap ideas include:

* Full patient portal
* Client pre-session check-ins
* Provider Pre-Session Dashboard
* In-Between Session Journal
* Progress note support from client-submitted check-ins
* Progress note support from journal entries
* Safety flag review workflow
* Automated eligibility checks
* Automated claim scrubbing
* ERA import and auto-posting
* Clearinghouse integration
* Payer portal automation support
* Contract variance detection
* Underpayment alerts
* AI-assisted documentation review
* AI-assisted coding review
* AI-assisted Mailroom document classification
* OCR-assisted Mailroom indexing
* Credentialing dashboard
* Provider education tools
* Client-facing financial tools
* Advanced reporting dashboards
* Multi-practice billing company command center

---

# Project Status

THERASSISTANT EHR is under active development.

The project is currently focused on building the database foundation, tenant access model, clinical preparation tools, patient portal tools, billing workflows, claim lifecycle, payment posting, ledger integrity, Mailroom document routing, and behavioral-health-specific documentation support.

---

# License

License information has not yet been selected.

Update this section before public release.
