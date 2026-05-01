export function buildAutoPriorityPrompt(taskTitle: string, taskDesc?: string) {
  return `You are a strict project management AI.
Classify the priority of the following task into exactly one of these enum values: LOW, MEDIUM, HIGH, URGENT.
Analyze the language, urgency words, and potential impact.

Task Title: ${taskTitle}
Task Description: ${taskDesc || 'None'}

Return ONLY a JSON object matching the requested schema.`;
}
