import api from "./api";

export async function checkAiHealth(): Promise<boolean> {
  try {
    const res = await api.get("/ai/health");
    return res.data.status === "ok";
  } catch {
    return false;
  }
}

export async function breakdownTask(projectId: string, taskId?: string, taskTitle?: string, taskDescription?: string) {
  const res = await api.post("/ai/breakdown", { projectId, taskId, taskTitle, taskDescription });
  return res.data;
}

export async function suggestAssignee(taskId: string) {
  const res = await api.post("/ai/suggest-assignee", { taskId });
  return res.data;
}

export async function autoPriority(taskTitle: string, taskDescription?: string) {
  const res = await api.post("/ai/auto-priority", { taskTitle, taskDescription });
  return res.data;
}

export async function generateStandup(teamId: string, sinceHours: number = 24) {
  const res = await api.post("/ai/standup", { teamId, sinceHours });
  return res.data;
}

export function subscribeToChat(_projectId: string, _question: string, _onMessage: (msg: string) => void, _onError: (err: unknown) => void) {
  // Use EventSource or fetch for SSE since Axios doesn't support SSE natively easily
  // We'll use fetch with the token
  // ... to be implemented if needed, but for simplicity we'll just do a POST request
  // if backend was converted to simple POST instead of SSE
}
