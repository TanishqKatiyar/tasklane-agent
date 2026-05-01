export const listTasksTool = {
  type: 'function',
  function: {
    name: 'listTasks',
    description: 'Get a list of recent or active tasks in the project.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by task status (e.g. TODO, IN_PROGRESS, DONE)' }
      }
    }
  }
};

export const getTaskByIdTool = {
  type: 'function',
  function: {
    name: 'getTaskById',
    description: 'Get detailed information about a specific task by its ID or key.',
    parameters: {
      type: 'object',
      properties: {
        taskId: { type: 'string' }
      },
      required: ['taskId']
    }
  }
};

export const getMemberWorkloadTool = {
  type: 'function',
  function: {
    name: 'getMemberWorkload',
    description: 'Get the current workload (assigned tasks) of a specific team member.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string' }
      },
      required: ['userId']
    }
  }
};

export const chatTools = [listTasksTool, getTaskByIdTool, getMemberWorkloadTool];
