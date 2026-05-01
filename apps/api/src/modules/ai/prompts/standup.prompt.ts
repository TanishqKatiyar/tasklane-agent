export function buildStandupPrompt(teamActivityContext: any[]) {
  const contextStr = JSON.stringify(teamActivityContext, null, 2);

  return `You are a Scrum Master AI generating a standup summary for a team.
Analyze the following activity logs from the last 24 hours.
Identify what each team member accomplished ("wins"), what they are working on next ("todayFocus"), and any potential "blockers" (overdue tasks, explicitly mentioned blockers, failed tasks).
Also provide a brief 1-2 sentence team summary.

Activity Context:
${contextStr}

Return ONLY a JSON object matching the requested schema.`;
}
