#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# Tasklane Tasks Module — End-to-End curl Demo
# ─────────────────────────────────────────────────────────
# Prerequisites: API running on port 4000, a team+project created.
#
# This script:
#   1. Registers a user + creates team + creates project
#   2. Creates tasks with auto-numbering
#   3. Lists with combined filters
#   4. Moves a task (drag-and-drop)
#   5. Adds a dependency
#   6. Attempts to create a circular dependency (fails)
# ─────────────────────────────────────────────────────────

set -euo pipefail
BASE="http://localhost:4000/api/v1"

echo "═══════════════════════════════════════════════"
echo " STEP 1: Register + Create Team + Create Project"
echo "═══════════════════════════════════════════════"
REG=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@tasklane.dev",
    "password": "Passw0rd1",
    "name": "Developer"
  }')
TOKEN=$(echo "$REG" | jq -r '.accessToken')
echo "→ Token: ${TOKEN:0:20}..."

TEAM=$(curl -s -X POST "$BASE/teams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Engineering", "description": "Engineering team"}')
TEAM_ID=$(echo "$TEAM" | jq -r '.id')
echo "→ Team: $TEAM_ID"

PROJECT=$(curl -s -X POST "$BASE/teams/$TEAM_ID/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Backend API", "key": "API", "description": "NestJS API"}')
PROJECT_ID=$(echo "$PROJECT" | jq -r '.id')
echo "→ Project: $PROJECT_ID"

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 2: Create 4 tasks (auto-numbered)"
echo "═══════════════════════════════════════════════"

T1=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Setup CI/CD pipeline", "priority": "HIGH", "status": "TODO"}')
echo "Task 1: #$(echo $T1 | jq -r '.number') — $(echo $T1 | jq -r '.title') [pos=$(echo $T1 | jq -r '.position')]"
TASK_A=$(echo "$T1" | jq -r '.id')

T2=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Write unit tests", "priority": "MEDIUM", "status": "TODO"}')
echo "Task 2: #$(echo $T2 | jq -r '.number') — $(echo $T2 | jq -r '.title') [pos=$(echo $T2 | jq -r '.position')]"
TASK_B=$(echo "$T2" | jq -r '.id')

T3=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Deploy to staging", "priority": "URGENT", "status": "BACKLOG"}')
echo "Task 3: #$(echo $T3 | jq -r '.number') — $(echo $T3 | jq -r '.title') [pos=$(echo $T3 | jq -r '.position')]"
TASK_C=$(echo "$T3" | jq -r '.id')

T4=$(curl -s -X POST "$BASE/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "priority": "HIGH", "status": "IN_PROGRESS"}')
echo "Task 4: #$(echo $T4 | jq -r '.number') — $(echo $T4 | jq -r '.title') [pos=$(echo $T4 | jq -r '.position')]"

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 3: List all tasks (no filter)"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" | jq '.meta'

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 4: Filter: status=TODO + priority=HIGH"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/projects/$PROJECT_ID/tasks?status=TODO&priority=HIGH" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | map({number, title, status, priority})'

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 5: Filter: search=deploy + orderBy=priority"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/projects/$PROJECT_ID/tasks?search=deploy&orderBy=priority&order=asc" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | map({number, title, priority})'

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 6: Move task from TODO → IN_PROGRESS (drag-and-drop)"
echo "═══════════════════════════════════════════════"
curl -s -X POST "$BASE/tasks/$TASK_A/move" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "IN_PROGRESS", "position": 512}' | jq '{id: .id, status: .status, position: .position}'

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 7: Add dependency — B is blocked by A"
echo "═══════════════════════════════════════════════"
curl -s -X POST "$BASE/tasks/$TASK_B/dependencies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"blockingTaskId\": \"$TASK_A\"}" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 8: Add dependency — C is blocked by B"
echo "═══════════════════════════════════════════════"
curl -s -X POST "$BASE/tasks/$TASK_C/dependencies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"blockingTaskId\": \"$TASK_B\"}" | jq .

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 9: Attempt cycle — A blocked by C (should FAIL)"
echo "═══════════════════════════════════════════════"
echo " (Chain is A→B→C, adding C→A would create a cycle)"
CYCLE_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$BASE/tasks/$TASK_A/dependencies" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"blockingTaskId\": \"$TASK_C\"}")
HTTP_CODE=$(echo "$CYCLE_RESULT" | tail -1)
BODY=$(echo "$CYCLE_RESULT" | sed '$d')
echo "HTTP $HTTP_CODE"
echo "$BODY" | jq .

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ Cycle correctly rejected!"
else
  echo "❌ Expected 400 but got $HTTP_CODE"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 10: Get full task detail (with deps)"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/tasks/$TASK_B" \
  -H "Authorization: Bearer $TOKEN" | jq '{title: .title, blockedBy: [.blockedBy[].blockingTask.title], blocking: [.blocking[].blockedTask.title]}'

echo ""
echo "═══════════════════════════════════════════════"
echo " STEP 11: My tasks (personal dashboard)"
echo "═══════════════════════════════════════════════"
curl -s "$BASE/users/me/tasks" \
  -H "Authorization: Bearer $TOKEN" | jq '.meta'

echo ""
echo "✅ Tasks demo complete!"
