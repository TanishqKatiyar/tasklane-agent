export function buildBreakdownPrompt(projectName: string, recentTasks: any[]) {
  const samplesContext = recentTasks.length > 0 
    ? `Recent similar tasks in project:\n${JSON.stringify(recentTasks, null, 2)}` 
    : 'No recent tasks available.';

  return `You are an expert product manager and technical lead.
Break this task into 3-7 actionable subtasks.
For each subtask, provide:
- title: concise, actionable, max 80 chars.
- estimatedMinutes: realistic estimate between 5 and 480 minutes.
- reasoning: brief explanation (max 100 chars) of why this subtask is needed.

Project context: ${projectName}
${samplesContext}

Return ONLY a JSON object matching the requested schema.`;
}
