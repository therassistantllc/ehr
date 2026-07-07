#!/usr/bin/env bash
set -euo pipefail

# Organizes locally imported/untracked files into domain folders.
# Run from the repository root. Review git status before committing.

mkdir -p \
  src/features/claims \
  src/features/eligibility \
  src/features/mailroom \
  src/features/payments \
  src/features/workqueues \
  src/features/medical-review \
  src/shared/auth \
  src/shared/types \
  src/shared/validation \
  src/shared/supabase \
  src/shared/utils

move_if_exists() {
  local source="$1"
  local dest="$2"
  if [ -e "$source" ]; then
    mkdir -p "$(dirname "$dest")"
    git mv "$source" "$dest" 2>/dev/null || mv "$source" "$dest"
    echo "moved $source -> $dest"
  fi
}

# Root-level claim and payer files
for file in \
  claimBuildErrors.ts claimNotes.ts claimStatusAutoCheck.tsx \
  claimStatusAutoCheckHeartbeat.tsx claimStatusDispatcher.tsx \
  payerReceivedService.ts payerReceivedService.types.ts \
  rejections277ca.ts rejections277caActions.tsx \
  transmissionFailures.ts uploadClaimDocument.tsx \
  timelyFiling.ts rarcCatalog.ts placeOfService.ts; do
  move_if_exists "$file" "src/features/claims/$file"
done

# Root-level eligibility files
for file in \
  eligibilityRoutingNotifier.tsx eligibilityRoutingReminderScan.ts codeSetFreshness.tsx; do
  move_if_exists "$file" "src/features/eligibility/$file"
done

# Root-level mailroom/fax files
for file in faxQueueWorker.tsx faxStatusReconciler.tsx; do
  move_if_exists "$file" "src/features/mailroom/$file"
done

# Root-level payment files
for file in cobBilling.ts recalculatePatientBalance.ts suggestOffsetPayment.ts; do
  move_if_exists "$file" "src/features/payments/$file"
done

# Root-level workqueue/live queue files
for file in liveQueueRoute.tsx liveQueues.tsx reportInsights.ts; do
  move_if_exists "$file" "src/features/workqueues/$file"
done

# Root-level auth/access files
for file in requireBillingAccess.ts providerEnrollmentIssuesService.ts providerEnrollmentIssuesTypes.ts; do
  move_if_exists "$file" "src/shared/auth/$file"
done

# Existing domain folders under src/services
move_if_exists "src/services/availity270" "src/features/eligibility/availity270"
move_if_exists "src/services/availity837p" "src/features/claims/availity837p"
move_if_exists "src/services/availity999" "src/features/claims/availity999"
move_if_exists "src/services/claim" "src/features/claims/claim"
move_if_exists "src/services/cob-update" "src/features/claims/cob-update"
move_if_exists "src/services/mailroom" "src/features/mailroom/mailroom"
move_if_exists "src/services/payments" "src/features/payments/payments"
move_if_exists "src/services/workqueue" "src/features/workqueues/workqueue"
move_if_exists "src/services/workflow" "src/features/workqueues/workflow"
move_if_exists "src/services/workflow-status" "src/features/workqueues/workflow-status"
move_if_exists "src/medical-review" "src/features/medical-review"

# Shared service folders
move_if_exists "src/services/rbac" "src/shared/auth/rbac"
move_if_exists "src/services/supabase" "src/shared/supabase"
move_if_exists "src/services/validation" "src/shared/validation"

cat <<'DONE'

Organization pass complete.

Next steps:
  git status --short
  npm run typecheck
  npm run build

Do not commit until typecheck/build pass or until broken imports are intentionally isolated from tsconfig.
DONE
