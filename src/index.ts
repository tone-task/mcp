#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Constants
const API_BASE = "https://api.tone-task.app";

// コマンドライン引数を解析
function parseArguments(): string {
    const args = process.argv.slice(2);
    
    // --secret または -s フラグを探す
    for (let i = 0; i < args.length; i++) {
        if ((args[i] === '--secret' || args[i] === '-s') && i + 1 < args.length) {
            return args[i + 1];
        }
        // --secret=value の形式もサポート
        if (args[i].startsWith('--secret=')) {
            return args[i].substring('--secret='.length);
        }
    }
    
    // 環境変数もフォールバックとして確認
    return process.env.TONE_AI_USER_SECRET || "";
}

const TONE_AI_USER_SECRET = parseArguments();

// シークレットが設定されていない場合はエラーを出力して終了
if (!TONE_AI_USER_SECRET) {
console.error("エラー: TONE_AI_USER_SECRET が設定されていません。");
    console.error("使用方法:");
    console.error("  npx tone-mcp --secret あなたのシークレット値");
    console.error("  npx tone-mcp -s あなたのシークレット値");
    console.error("  npx tone-mcp --secret=あなたのシークレット値");
    console.error("");
    console.error("または環境変数として設定:");
    console.error("  export TONE_AI_USER_SECRET='あなたのシークレット値'");
    process.exit(1);
}

// Initialize MCP server
const server = new McpServer({
    name: "tone",
    version: "1.0.0"
});

// Types
interface ToneResponse {
    [key: string]: any;
}

// Helper functions
async function makeToneRequestGet(url: string, body: Record<string, any>): Promise<ToneResponse | string> {
    const headers = {
        "Authorization": `Bearer ${TONE_AI_USER_SECRET}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await fetch(`${API_BASE}${url}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        return `エラーが発生しました: ${JSON.stringify(body)} ${error instanceof Error ? error.message : String(error)}`;
    }
}

async function makeToneRequestCreate(url: string, body: Record<string, any>): Promise<string> {
    const headers = {
        "Authorization": `Bearer ${TONE_AI_USER_SECRET}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await fetch(`${API_BASE}${url}`, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.status === 200 ? "Success" : "Failed";
    } catch (error) {
        return "Failed";
    }
}

function formatWorkspace(content: Record<string, any>): string {
    const workspaceProfile = content.profile || {};
    
    return `
Workspace ID: ${content.id || 'Unknown'}
Workspace UserDefined ID: ${content.userDefinedWorkspaceId || 'Unknown'}
Workspace Name: ${workspaceProfile.name || 'Unknown'}
Workspace Symbol Emoji: ${workspaceProfile.emoji || 'Unknown'}

Workspace Tree: ${JSON.stringify(content, null, 2)}
`;
}

function formatAssignee(assignee: Record<string, any>): string {
    return `${assignee.displayName}（ID: ${assignee.id || 'Unknown'}）`;
}

function formatSubtask(subtask: Record<string, any>): string {
    const subtaskAssignees = subtask.assignees || [];
    const subtaskAssigneeList = subtaskAssignees.map((assignee: Record<string, any>) => formatAssignee(assignee));
    
    const subtaskTags = subtask.tags || [];
    const subtaskTagList = subtaskTags.map((tag: Record<string, any>) => tag.name || 'Unknown').filter(Boolean);
    
    const subtaskDueDate = subtask.dueDate ? new Date(subtask.dueDate).toISOString() : '';
    const subtaskDescription = subtask.description ? ` - 説明: ${(subtask.description).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '\\"').replace(/\n/g, '\\n')}` : '';
    
    const dueDatePart = subtaskDueDate ? ` - 期限: ${subtaskDueDate}` : '';
    const assigneePart = subtaskAssigneeList.length > 0 ? ` - 担当: ${subtaskAssigneeList.join(', ')}` : '';
    const tagPart = subtaskTagList.length > 0 ? ` - タグ: ${subtaskTagList.join(', ')}` : '';
    
    return `  - ${subtask.title || 'Unknown'} (${subtask.status || 'Unknown'})${subtaskDescription}${dueDatePart}${assigneePart}${tagPart}`;
}

function formatTasks(content: Record<string, any>): string {
    const assignees = content.assignees || [];
    const assigneeList = assignees.map((assignee: Record<string, any>) => formatAssignee(assignee));
    
    const tags = content.tags || [];
    const tagList = tags.map((tag: Record<string, any>) => tag.name || 'Unknown').filter(Boolean);
    
    const subtasks = content.subtasks || [];
    const subtaskList = subtasks.map(formatSubtask);
    
    // Format due date in ISO 8601 format
    const dueDate = content.dueDate ? new Date(content.dueDate).toISOString() : 'なし';
    
    return `
タスクID: ${content.id || 'Unknown'}
タイトル: ${(content.title || 'Unknown').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '\\"').replace(/\n/g, '\\n')}
ステータス: ${content.status || 'Unknown'}
説明: ${(content.description || 'Unknown').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '\\"').replace(/\n/g, '\\n')}
期限: ${dueDate}
担当: ${assigneeList.length > 0 ? '\n- ' + assigneeList.join('\n- ') : 'なし'}
タグ: ${tagList.length > 0 ? tagList.join(', ') : 'なし'}
サブタスク: ${subtaskList.length > 0 ? '\n' + subtaskList.join('\n') : 'なし'}
リスト: ${content.listName || "Unknown"} (${content.listId || 'Unknown'})
`;
}

function formatUser(user: Record<string, any>): string {
    return `
ユーザーID: ${user.id || 'Unknown'}
表示名: ${user.displayName || 'Unknown'}
メール: ${user.email || 'Unknown'}
作成日時: ${user.createdAt || 'Unknown'}
更新日時: ${user.updatedAt || 'Unknown'}
アイコンURL: ${user.iconUrl || 'Unknown'}
`;
}

// Tools
server.tool(
    "get_myself",
    {
        description: "自分自身のユーザー情報を取得します。自分のユーザーIDはこのツールで確認できます"
    },
    async () => {
        const url = "/proto.user.v1.UserService/GetMySelf";
        const data = await makeToneRequestGet(url, {});
        
        if (typeof data === "string" || !data || !("user" in data)) {
            return {
                content: [{
                    type: "text",
                    text: "ユーザー情報を取得できませんでした。"
                }]
            };
        }
        
        const user = data.user as Record<string, any>;
        const result = `
ユーザーID: ${user.id || '不明'}
メールアドレス: ${user.email || '不明'}
表示名: ${user.displayName || '不明'}
作成日時: ${user.createdAt || '不明'}
更新日時: ${user.updatedAt || '不明'}
アイコンURL: ${user.iconUrl || '不明'}
説明: ${user.description || '不明'}
ユーザータイプ: ${user.type || '不明'}
`;
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "get_mytasks",
    "Get my own tasks.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool.")
    },
    async ({ workspace_id }) => {
        const url = "/proto.task.v1.TaskService/GetMyTasks";
        const data = await makeToneRequestGet(url, { workspace_id });
        
        if (typeof data === "string" || !data || !("tasks" in data)) {
            return {
                content: [{
                    type: "text",
                    text: typeof data === "string" ? data : "タスクを取得できませんでした。"
                }]
            };
        }
        
        const tasks = (data.tasks as Record<string, any>[]).map(formatTasks);
        
        return {
            content: [{
                type: "text",
                text: tasks.join("\n---\n")
            }]
        };
    }
);

server.tool(
    "get_workspaces",
    {
        description: "Get tone workspace. You can get workspace, teamspace, and list info. This tool provides necessary information for subsequent tasks when you specify list or teamspace names."
    },
    async () => {
        const url = "/proto.group.v1.GroupService/GetWorkspaces";
        const data = await makeToneRequestGet(url, {});
        
        if (typeof data === "string" || !data || !("workspaces" in data)) {
            return {
                content: [{
                    type: "text",
                    text: `ワークスペースの取得に失敗したか、ワークスペースが見つかりませんでした。${typeof data === "string" ? data : ""}`
                }]
            };
        }
        
        const workspaces = data.workspaces as Record<string, any>[];
        if (!workspaces || workspaces.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: "No active workspaces found."
                }]
            };
        }
        
        const workspaceInfo = formatWorkspace(workspaces[0]);
        
        return {
            content: [{
                type: "text",
                text: workspaceInfo
            }]
        };
    }
);

server.tool(
    "get_tasks",
    "Get todo tasks by list id. this task contains other members tasks.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id user specified (or you can get it from get_workspaces tool.)"),
    },
    async ({ workspace_id, teamspace_id, list_id }) => {
        const url = "/proto.task.v1.TaskService/GetTasks";

        const data = await makeToneRequestGet(url, {
            workspace_id: workspace_id,
            teamspace_id: teamspace_id,
            list_id: list_id,
            order_by: "custom_position"
        });
        
        if (typeof data === "string" || !data || !("tasks" in data)) {
            return {
                content: [{
                    type: "text",
                    text: typeof data === "string" ? data : "タスクを取得できませんでした。"
                }]
            };
        }
        
        const tasks = (data.tasks as Record<string, any>[]).map(formatTasks);
        
        return {
            content: [{
                type: "text",
                text: tasks.join("\n---\n")
            }]
        };
    }
);

server.tool(
    "get_task_by_id",
    "Get a specific task by its task ID.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        task_id: z.string().describe("task id user specified. Format: ta-xxxxxxxxxx")
    },
    async ({ workspace_id, task_id }) => {
        const url = "/proto.task.v1.TaskService/GetTaskByTaskID";
        const data = await makeToneRequestGet(url, { workspace_id, task_id });
        
        if (typeof data === "string" || !data || !("task" in data)) {
            return {
                content: [{
                    type: "text",
                    text: typeof data === "string" ? data : "タスクを取得できませんでした。"
                }]
            };
        }
        
        const task = data.task as Record<string, any>;
        const formattedTask = formatTasks(task);
        
        return {
            content: [{
                type: "text",
                text: formattedTask
            }]
        };
    }
);

server.tool(
    "get_users",
    "Toneのユーザー一覧を取得します。",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool.")
    },
    async ({ workspace_id }) => {
        const url = "/proto.user.v1.UserService/GetUsers";
        const data = await makeToneRequestGet(url, { workspace_id });
        
        if (typeof data === "string" || !data || !("users" in data)) {
            return {
                content: [{
                    type: "text",
                    text: "ユーザー情報の取得に失敗したか、ユーザーが見つかりませんでした。"
                }]
            };
        }
        
        const users = data.users as Record<string, any>[];
        if (!users || users.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: "ユーザーが見つかりませんでした。"
                }]
            };
        }
        
        const userList = users.map(formatUser);
        
        return {
            content: [{
                type: "text",
                text: userList.join("\n---\n")
            }]
        };
    }
);

server.tool(
    "create_task",
    "Create a task in tone.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. list is specified by user or  you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id related to the task. you can get it from task detail or get_workspaces tool."),
        title: z.string().describe("task title. You can use up to 50 characters, but it's better to keep it within 20 characters."),
        description: z.string().describe("task description. you can use markdown."),
        assign_user_ids: z.array(z.string()).describe("assignee id list. you can get assignee id from get_users tool. by default, you should set it yourself.")
    },
    async ({ workspace_id, teamspace_id, list_id, title, description, assign_user_ids }) => {
        const url = "/proto.task.v1.TaskService/CreateTask";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            title,
            description,
            assign_user_ids
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "create_sub_task",
    "Create a sub-task in tone.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. list is specified by user or  you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id related to the task. you can get it from task detail or get_workspaces tool."),
        parent_task_id: z.string().describe("parent task id. you can get it from get_tasks tool or ask the user."),
        title: z.string().describe("task title. You can use up to 50 characters, but it's better to keep it within 20 characters."),
        description: z.string().describe("task description. you can use markdown."),
        assign_user_ids: z.array(z.string()).describe("assignee id list. you can get assignee id from get_users tool. by default, you should set it yourself.")
    },
    async ({ workspace_id, teamspace_id, list_id, parent_task_id, title, description, assign_user_ids }) => {
        const url = "/proto.task.v1.TaskService/CreateTask";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            parent_task_id,
            title,
            description,
            assign_user_ids
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "update_task_title",
    "タスクのタイトルを更新します。",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. list is specified by user or  you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id related to the task. you can get it from task detail or get_workspaces tool."),
        task_id: z.string().describe("task id. you can get it from get_tasks tool."),
        title: z.string().describe("new task title. You can use up to 50 characters, but it's better to keep it within 20 characters.")
    },
    async ({ workspace_id, teamspace_id, list_id, task_id, title }) => {
        const url = "/proto.task.v1.TaskService/UpdateTaskTitle";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            task_id,
            title
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "update_task_description",
    "タスクの説明を更新します。",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. list is specified by user or  you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id related to the task. you can get it from task detail or get_workspaces tool."),
        task_id: z.string().describe("task id. you can get it from get_tasks tool."),
        description: z.string().describe("new task description. you can use markdown.")
    },
    async ({ workspace_id, teamspace_id, list_id, task_id, description }) => {
        const url = "/proto.task.v1.TaskService/UpdateTaskDescription";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            task_id,
            description
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "update_task_status",
    "Update the status of a task in tone. you can update multiple tasks at once.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. list is specified by user or  you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id related to the task. you can get it from task detail or get_workspaces tool."),
        task_ids: z.array(z.string()).describe("task id list"),
        status: z.string().describe('task status. you can choose from "TODO", "DOING", "DONE"')
    },
    async ({ workspace_id, teamspace_id, list_id, task_ids, status }) => {
        const url = "/proto.task.v1.TaskService/BatchUpdateTaskStatus";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            task_ids,
            status
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "update_task_assignees",
    "Update the assignees of a task in tone. you can update multiple tasks at once.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id related to the task. you can get it from task detail or get_workspaces tool."),
        task_ids: z.array(z.string()).describe("task id list"),
        assign_user_ids: z.array(z.string()).describe("assignee id list. you can get assignee id from get_users tool.")
    },
    async ({ workspace_id, teamspace_id, list_id, task_ids, assign_user_ids }) => {
        const url = "/proto.task.v1.TaskService/BatchUpdateTaskAssignees";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            task_ids,
            assign_user_ids
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "create_list",
    "Create a list in tone.",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id user specified (or you can get it from get_workspaces tool.)"),
        name: z.string().describe("name of the list to create")
    },
    async ({ workspace_id, teamspace_id, name }) => {
        const url = "/proto.group.v1.GroupService/CreateList";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            name
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "update_task_due_date",
    "タスクの期日（DueDate）を変更します。繰り返しタスクのDueDate更新はMCPでは非対応です。",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id related to the task. you can get it from task detail or get_workspaces tool."),
        task_ids: z.array(z.string()).describe("task id list"),
        due_date: z.string().describe("新しい期日（ISO 8601形式の文字列）。例: 2024-07-01T00:00:00Z")
    },
    async ({ workspace_id, teamspace_id, list_id, task_ids, due_date }) => {
        // 繰り返しタスクのDueDate更新はMCPでは非対応です。
        const url = "/proto.task.v1.TaskService/BatchUpdateTaskDueDate";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            task_ids,
            due_date
        });
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

server.tool(
    "get_task_templates",
    "タスクテンプレート一覧を取得します。テンプレートとはタスクをひとまとまりにしたものです。",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool.")
    },
    async ({ workspace_id }) => {
        const url = "/proto.task_template.v1.TaskTemplateService/GetTaskTemplates";
        const data = await makeToneRequestGet(url, { workspace_id });
        
        if (typeof data === "string" || !data || !("taskTemplates" in data)) {
            return {
                content: [{
                    type: "text",
                    text: typeof data === "string" ? data : "タスクテンプレートを取得できませんでした。"
                }]
            };
        }
        
        const templates = data.taskTemplates as Record<string, any>[];
        if (!templates || templates.length === 0) {
            return {
                content: [{
                    type: "text",
                    text: "タスクテンプレートが見つかりませんでした。"
                }]
            };
        }
        
        const templateList = templates.map((template: Record<string, any>) => {
            const tasks = template.tasks || [];
            const taskList = tasks.map((task: Record<string, any>) => 
                `  - ${task.title || 'Unknown'} (${task.description || '説明なし'})`
            ).join('\n');
            
            return `
テンプレートID: ${template.id || 'Unknown'}
テンプレート名: ${template.title || 'Unknown'}
説明: ${template.description || 'なし'}
作成日時: ${template.createdAt || 'Unknown'}
更新日時: ${template.updatedAt || 'Unknown'}
タスク数: ${tasks.length}
タスク一覧:
${taskList || '  なし'}`;
        });
        
        return {
            content: [{
                type: "text",
                text: templateList.join("\n---\n")
            }]
        };
    }
);

server.tool(
    "create_tasks_from_template",
    "タスクテンプレートからタスクを作成します。",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id related to the list. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id where tasks will be created. you can get it from get_workspaces tool."),
        task_template_id: z.string().describe("task template id. you can get it from get_task_templates tool. Format: tt-xxxxxxxxxx")
    },
    async ({ workspace_id, teamspace_id, list_id, task_template_id }) => {
        const url = "/proto.task_template.v1.TaskTemplateService/CreateTasksFromTaskTemplate";
        const result = await makeToneRequestCreate(url, {
            workspace_id,
            teamspace_id,
            list_id,
            task_template_id
        });
        
        return {
            content: [{
                type: "text",
                text: result
            }]
        };
    }
);

// Main function
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);

    if (import.meta.url === `file://${process.argv[1]}`) {
        console.log("Server started");
    }
}


main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
