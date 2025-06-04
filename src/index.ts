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
    console.error("  node src/index.ts --secret あなたのシークレット値");
    console.error("  node src/index.ts -s あなたのシークレット値");
    console.error("  node src/index.ts --secret=あなたのシークレット値");
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

function formatTasks(content: Record<string, any>): string {
    const assignees = content.assignees || [];
    const assigneeList = assignees.map((assignee: Record<string, any>) => formatAssignee(assignee));
    
    return `
タスクID: ${content.id || 'Unknown'}
タイトル: ${(content.title || 'Unknown').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '\\"').replace(/\n/g, '\\n')}
ステータス: ${content.status || 'Unknown'}
説明: ${(content.description || 'Unknown').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '\\"').replace(/\n/g, '\\n')}
担当: ${assigneeList.length > 0 ? '\n- ' + assigneeList.join('\n- ') : 'なし'}
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
        teamspace_id: z.string().describe("teamspace id. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id. you can get it from get_workspaces tool."),
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
        teamspace_id: z.string().describe("teamspace id. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id. you can get it from get_workspaces tool or task detail."),
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
    "update_task_title",
    "タスクのタイトルを更新します。",
    {
        workspace_id: z.string().describe("workspace id. you can get it from get_workspaces tool."),
        teamspace_id: z.string().describe("teamspace id. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id. you can get it from get_workspaces tool or task detail."),
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
        teamspace_id: z.string().describe("teamspace id. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id. you can get it from get_workspaces tool or task detail."),
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
        teamspace_id: z.string().describe("teamspace id. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id. you can get it from get_workspaces tool or task detail."),
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
        teamspace_id: z.string().describe("teamspace id. you can get it from get_workspaces tool."),
        list_id: z.string().describe("list id. you can get it from get_workspaces tool or task detail."),
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
    "リストを作成します。",
    {
        workspace_id: z.string().describe("ワークスペースID。get_workspacesツールから取得できます。"),
        teamspace_id: z.string().describe("チームスペースID。get_workspacesツールから取得できます。"),
        name: z.string().describe("作成するリストの名前。")
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
