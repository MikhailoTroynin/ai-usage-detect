#!/usr/bin/env bash
#
# Step 12 — real Supabase deploy for the AI Humanizer Edge Functions.
#
# Turns the manual README "Deploy" steps into one idempotent command:
#   link  ->  set ANTHROPIC_API_KEY secret  ->  deploy humanize/alternatives/detect
#
# This script must be run LOCALLY (or in CI) by someone who owns the target
# Supabase project. It cannot run from the ephemeral build container: it needs
# the project-ref, a freshly-rotated ANTHROPIC_API_KEY, and the `supabase` CLI
# authenticated against a live project.
#
# Usage:
#   supabase/deploy.sh <project-ref>
#
# Requirements:
#   - supabase CLI installed and logged in (`supabase login`)
#   - supabase/.env.local present with ANTHROPIC_API_KEY=<new, rotated key>
#     (copy from supabase/.env.example; this file is gitignored)
#
# Security: treat any key ever pasted into chat/CI/logs as compromised. Use a
# NEW key issued from the Anthropic Console for the live deploy and revoke the
# old one.

set -euo pipefail

FUNCTIONS=(humanize alternatives detect)

# --- resolve paths ----------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.local"

die() { echo "error: $*" >&2; exit 1; }

# --- args -------------------------------------------------------------------
PROJECT_REF="${1:-${SUPABASE_PROJECT_REF:-}}"
[ -n "${PROJECT_REF}" ] || die "missing project-ref.
usage: supabase/deploy.sh <project-ref>
(or set SUPABASE_PROJECT_REF). Find it in your Supabase dashboard URL:
https://supabase.com/dashboard/project/<project-ref>"

# --- preconditions ----------------------------------------------------------
command -v supabase >/dev/null 2>&1 \
  || die "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"

[ -f "${ENV_FILE}" ] \
  || die "missing ${ENV_FILE}. Copy supabase/.env.example -> supabase/.env.local and fill in a NEW ANTHROPIC_API_KEY."

# Load ANTHROPIC_API_KEY from the (gitignored) local env file without echoing it.
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

[ -n "${ANTHROPIC_API_KEY:-}" ] \
  || die "ANTHROPIC_API_KEY is empty in ${ENV_FILE}. Use a NEW, rotated key."

# --- deploy -----------------------------------------------------------------
echo ">> linking project ${PROJECT_REF}"
supabase link --project-ref "${PROJECT_REF}"

echo ">> setting ANTHROPIC_API_KEY secret (server-side only)"
supabase secrets set "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}"

for fn in "${FUNCTIONS[@]}"; do
  echo ">> deploying function: ${fn}"
  supabase functions deploy "${fn}"
done

FUNCTIONS_URL="https://${PROJECT_REF}.supabase.co/functions/v1"
cat <<EOF

Done. Deployed: ${FUNCTIONS[*]}

Next: point the Expo client at the deployed Functions URL instead of the
local default by setting the public client variable:

  EXPO_PUBLIC_API_URL=${FUNCTIONS_URL}

Note: these functions are still verify_jwt = false (auth deferred, see PLAN.md
item 13). Do not expose them publicly without adding auth and a rate limit.
EOF
