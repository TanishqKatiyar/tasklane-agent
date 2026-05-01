export function buildSuggestAssigneePrompt(taskTitle: string, taskDesc: string, membersData: any[]) {
  const membersContext = JSON.stringify(membersData, null, 2);

  return `You are an intelligent project management assistant.
Suggest the best assignees for this task based on team members' past tasks, skills, and current workload.
Provide up to 3 suggestions, sorted by confidence (highest first).

Team Members Data:
${membersContext}

Return ONLY a JSON object matching the requested schema.`;
}
