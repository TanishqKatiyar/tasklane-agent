#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Tasklane Teams Module — End-to-End curl Demo
# ─────────────────────────────────────────────────────────
# Prerequisites:
#   docker compose up -d
#   cd apps/api && pnpm prisma migrate dev && pnpm prisma generate
#   pnpm dev
# ─────────────────────────────────────────────────────────

set -euo pipefail
BASE="http://localhost:4000/api/v1"

echo "═══════════════════════════════════════════════"
echo " STEP 1: Register User A (Alice — team creator)"
echo "═══════════════════════════════════════════════"
ALICE=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@tasklane.dev",
    "password": "Passw0rd1",
    "name": "Alice"
  }')
echo "$ALICE" | jq .
ALICE_TOKEN=$(echo "$ALICE" | jq -r '.accessToken')
echo "→ Alice token: ${ALICE_TOKEN:0:20}..."

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 2: Register User B (Bob — invitee)"
echo "═══════════════════════════════════════════════"
BOB=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@tasklane.dev",
    "password": "Passw0rd2",
    "name": "Bob"
  }')
echo "$BOB" | jq .
BOB_TOKEN=$(echo "$BOB" | jq -r '.accessToken')
echo "→ Bob token: ${BOB_TOKEN:0:20}..."

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 3: Alice creates a team"
echo "═══════════════════════════════════════════════"
TEAM=$(curl -s -X POST "$BASE/teams" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corp",
    "description": "Acme team workspace"
  }')
echo "$TEAM" | jq .
TEAM_ID=$(echo "$TEAM" | jq -r '.id')
echo "→ Team ID: $TEAM_ID"

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 4: Alice lists her teams"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/teams" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 5: Alice invites Bob"
echo "═══════════════════════════════════════════════"
INVITE=$(curl -s -X POST "$BASE/teams/$TEAM_ID/invitations" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bob@tasklane.dev",
    "role": "MEMBER"
  }')
echo "$INVITE" | jq .
echo ""
echo "📧 (In dev mode, the invitation token is logged to the API console."
echo "    Copy the token from the invite URL logged in the API output.)"
echo ""
echo "→ Paste the invitation token from the API logs:"
read -rp "TOKEN: " INV_TOKEN

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 6: Bob accepts the invitation"
echo "═══════════════════════════════════════════════"
curl -s -X POST "$BASE/invitations/accept" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$INV_TOKEN\"}" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 7: Alice lists team members"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/teams/$TEAM_ID/members" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 8: Alice promotes Bob to ADMIN"
echo "═══════════════════════════════════════════════"
BOB_ID=$(echo "$BOB" | jq -r '.user.id')
curl -s -X PATCH "$BASE/teams/$TEAM_ID/members/$BOB_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}' | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 9: Verify Bob is now ADMIN"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/teams/$TEAM_ID/members" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 10: Alice demotes Bob back to MEMBER"
echo "═══════════════════════════════════════════════"
curl -s -X PATCH "$BASE/teams/$TEAM_ID/members/$BOB_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "MEMBER"}' | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 11: Alice removes Bob from the team"
echo "═══════════════════════════════════════════════"
curl -s -X DELETE "$BASE/teams/$TEAM_ID/members/$BOB_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 12: Verify Bob is gone"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/teams/$TEAM_ID/members" \
  -H "Authorization: Bearer $ALICE_TOKEN" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 13: Bob tries to view Team (should 403)"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/teams/$TEAM_ID" \
  -H "Authorization: Bearer $BOB_TOKEN" | jq .

echo ""
echo "✅ Demo complete!"
