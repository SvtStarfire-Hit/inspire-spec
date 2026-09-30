/**
 * MCP 服务冒烟测试 —— 运行：node test-mcp.js
 *
 * 验证：
 *   - 工具注册（tools/list）
 *   - get_stage_checklist：总览 / 单阶段 / 未知参数
 *   - list_scenes 返回结构
 *   - get_scene_guidance：场景覆盖 / 未知参数
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({ name: "inspire-spec-test", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(__dirname, "mcp-server.js")],
  cwd: __dirname,
});

await client.connect(transport);

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}
const parse = (r) => JSON.parse(r.content[0].text);

// 1. 工具注册
const tools = await client.listTools();
check("tools/list 含 get_stage_checklist", tools.tools.some((t) => t.name === "get_stage_checklist"));
check("tools/list 含 list_scenes", tools.tools.some((t) => t.name === "list_scenes"));
check("tools/list 含 get_scene_guidance", tools.tools.some((t) => t.name === "get_scene_guidance"));

// 2. 总览（stage 缺省）
const ov = parse(await client.callTool({ name: "get_stage_checklist", arguments: {} }));
check("总览返回 7 个阶段", ov.stages.length === 7, String(ov.stages?.length));
check("总览 suggestedEntry = intake", ov.suggestedEntry === "intake");
check("总览含场景列表", Array.isArray(ov.scenes) && ov.scenes.length === 2);

// 3. 单阶段：intake
const intake = parse(await client.callTool({ name: "get_stage_checklist", arguments: { stage: "intake" } }));
check("intake 有 goal", typeof intake.goal === "string" && intake.goal.length > 0);
check("intake 有 aDeliverables", Array.isArray(intake.aDeliverables) && intake.aDeliverables.length >= 3);
check("intake 有 bDeliverables", Array.isArray(intake.bDeliverables) && intake.bDeliverables.length >= 1);
check("intake 有 boundaryConstraints", Array.isArray(intake.boundaryConstraints) && intake.boundaryConstraints.length >= 2);
check("intake 有 acceptanceCriteria", Array.isArray(intake.acceptanceCriteria) && intake.acceptanceCriteria.length >= 2);
check("intake 无 aiPromptTemplate", intake.aiPromptTemplate === undefined);
check("intake 有 exitCriteria", Array.isArray(intake.exitCriteria) && intake.exitCriteria.length >= 3);
check("intake 有 rules", Array.isArray(intake.rules) && intake.rules.length >= 3);
check("intake 有 aGuidance", Array.isArray(intake.aGuidance) && intake.aGuidance.length >= 3);
check("intake 有 pitfalls", Array.isArray(intake.pitfalls) && intake.pitfalls.length >= 3);
check("intake 有 checklist", Array.isArray(intake.checklist) && intake.checklist.length >= 3);
check("intake 有 humanCheckpoint", typeof intake.humanCheckpoint === "string");

check("intake 有 revisionImpact", Array.isArray(intake.revisionImpact));

// 4. 单阶段：release（收尾阶段完整性）
const rel = parse(await client.callTool({ name: "get_stage_checklist", arguments: { stage: "release" } }));
check("release 字段齐全", Boolean(rel.goal && rel.exitCriteria && rel.aGuidance && rel.humanCheckpoint && rel.revisionImpact && rel.boundaryConstraints && rel.acceptanceCriteria));

// 5. 未知 stage
const un = parse(await client.callTool({ name: "get_stage_checklist", arguments: { stage: "nope" } }));
check("未知 stage 返回 error", typeof un.error === "string");
check("未知 stage 附合法清单", Array.isArray(un.validStages) && un.validStages.length === 7);

// 6. list_scenes
const sc = parse(await client.callTool({ name: "list_scenes", arguments: {} }));
check("list_scenes 返回 2 个场景", sc.scenes.length === 2);
check("web 场景状态为 available", sc.scenes.find((s) => s.id === "web")?.status === "available");
check("hw 场景状态为 available", sc.scenes.find((s) => s.id === "hw")?.status === "available");

// 7. get_scene_guidance：web 场景覆盖 contract 阶段
const wc = parse(await client.callTool({ name: "get_scene_guidance", arguments: { scene: "web", stage: "contract" } }));
check("web contract 带 sceneId", wc.sceneId === "web");
check("web contract 覆盖含 API 契约", wc.aDeliverables?.some((d) => d.name?.includes("API")));
check("web contract 覆盖含数据库 Schema", wc.aDeliverables?.some((d) => d.name?.includes("Schema")));

// 8. get_scene_guidance：hw 场景覆盖 contract 阶段
const hc = parse(await client.callTool({ name: "get_scene_guidance", arguments: { scene: "hw", stage: "contract" } }));
check("hw contract 带 sceneId", hc.sceneId === "hw");
check("hw contract 覆盖含设备通信契约", hc.aDeliverables?.some((d) => d.name?.includes("设备通信")));
check("hw contract 覆盖含设备状态机", hc.aDeliverables?.some((d) => d.name?.includes("设备状态机")));

// 9. get_scene_guidance：无覆盖的阶段返回通用内容
const wi = parse(await client.callTool({ name: "get_scene_guidance", arguments: { scene: "web", stage: "implement" } }));
check("web implement 无覆盖，返回通用内容", wi.sceneId === "web" && typeof wi.goal === "string");

// 10. 未知 scene
const us = parse(await client.callTool({ name: "get_scene_guidance", arguments: { scene: "nope", stage: "intake" } }));
check("未知 scene 返回 error", typeof us.error === "string");

console.log(`\n结果：通过 ${pass}，失败 ${fail}`);
await client.close();
process.exit(fail > 0 ? 1 : 0);
