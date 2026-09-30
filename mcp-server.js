#!/usr/bin/env node
/**
 * InspireSpec MCP 服务（原型阶段）
 *
 * 提供四个工具：
 *   - get_stage_checklist   获取阶段约束包（双轨制完整） / 7 阶段总览
 *   - get_acceptance_spec   获取 B 系列验收规格（边界约束+验收用例+接口签名）
 *   - list_scenes           列出场景扩展
 *   - get_scene_guidance    获取场景覆盖后的阶段约束包
 *
 * 传输：stdio —— 在 AI IDE 的 MCP 配置中注册后即用
 *
 * 设计约束（与 InspireDesign 对齐）：
 *   - 无状态：不记录进展；进展由 AI 依据 dependencies 与实际文件判断
 *   - 信息提供者：不执行系统操作
 *   - stdout 是协议通道：日志一律走 console.error
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { stages } from "./data/stages.js";
import { scenes } from "./data/scenes.js";

const stageMap = new Map(stages.map((s) => [s.id, s]));
const sceneMap = new Map(scenes.map((s) => [s.id, s]));

/** 组装某阶段的完整约束包（无场景覆盖时直接返回原始数据） */
function buildStageContract(stage, notice) {
  const contract = { ...stage };
  if (notice) contract.notice = notice;
  return contract;
}

/** 组装某场景某阶段的约束包（字段级覆盖：场景覆盖 > 通用内容） */
function buildSceneStageContract(scene, stage, notice) {
  const override = scene.stageOverrides?.[stage.id] ?? {};
  const merged = { ...stage, ...override };
  const contract = { sceneId: scene.id, ...merged };
  if (notice) contract.notice = notice;
  return contract;
}

/** 组装 B 系列验收规格（边界约束+验收用例+接口签名） */
function buildAcceptanceSpec(stage, scene, notice) {
  const source = scene ? { ...stage, ...(scene.stageOverrides?.[stage.id] ?? {}) } : { ...stage };
  const spec = {
    stageId: stage.id,
    stageName: stage.name,
    bDeliverables: source.bDeliverables ?? [],
    boundaryConstraints: source.boundaryConstraints ?? [],
    acceptanceCriteria: source.acceptanceCriteria ?? [],
    interfaceSignatures: source.interfaceSignatures ?? [],
  };
  if (scene) spec.sceneId = scene.id;
  if (notice) spec.notice = notice;
  return spec;
}

/** 7 阶段总览 */
function buildOverview(notice) {
  const overview = {
    stages: stages.map((s) => ({
      id: s.id, number: s.number, name: s.name, goal: s.goal,
    })),
    suggestedEntry: "intake",
    scenes: scenes.map((s) => ({ id: s.id, name: s.name, status: s.status })),
    howToUse: [
      "开场先取总览建立全景，然后逐阶段获取约束包并按 aGuidance 引导",
      "每个阶段：先按 aGuidance 引导，产出后停下来等用户确认（humanCheckpoint）",
      "推进与新阶段的触发词来自用户（\"行 / 下一步 / 可以了\"）——本工具不判断满意度",
      "用户提出改动时：按 revisionImpact 判断回退范围",
      "如有场景需求，用 list_scenes 查看可用场景，用 get_scene_guidance 获取场景覆盖后的约束",
    ],
  };
  if (notice) overview.notice = notice;
  return overview;
}

function textResult(obj) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

const server = new McpServer({
  name: "inspire-spec",
  version: "0.1.0",
  instructions:
    "把\"设计资产→工程规格\"的方法论按 7 阶段流程引导用户（双轨制：A 系列给人看，B 系列给 AI 用）。使用方式：先用 get_stage_checklist 取 7 阶段总览建立全景，再逐阶段获取约束包并按 aGuidance 引导。每个阶段结束必须停下来等用户确认（humanCheckpoint）；用户想改上游内容时，按 revisionImpact 判断回退范围。B 系列的 boundaryConstraints 和 acceptanceCriteria 是 AI 编码的核心依据。如有场景需求（Web/软硬件），用 list_scenes 和 get_scene_guidance。本服务无状态、不判断进展。",
});

server.registerTool(
  "get_stage_checklist",
  {
    title: "获取阶段约束包（核心工具）",
    description:
      "获取某个阶段的完整约束包（双轨制）：目标、A 系列产物、B 系列产物、出口条件、前置依赖、硬规则、A 系列引导步骤、边界约束、验收用例、常见坑、回退影响面、人确认点、门禁清单。" +
      "不传 stage 时返回 7 阶段总览。任何阶段可随时获取，支持回退修正；工具无状态、不做流程门禁。",
    inputSchema: {
      stage: z
        .string()
        .optional()
        .describe(
          "阶段 id，见总览返回的 stages[].id（intake / data / contract / arch / implement / verify / release）；缺省返回 7 阶段总览"
        ),
    },
  },
  async ({ stage }) => {
    if (!stage) {
      return textResult(buildOverview());
    }
    const s = stageMap.get(stage);
    if (!s) {
      return textResult({
        error: `未知阶段 "${stage}"`,
        validStages: stages.map((x) => ({ number: x.number, id: x.id, name: x.name })),
        hint: "不传 stage 参数可获取 7 阶段总览",
      });
    }
    return textResult(buildStageContract(s));
  }
);

server.registerTool(
  "get_acceptance_spec",
  {
    title: "获取 B 系列验收规格",
    description:
      "获取某阶段的 B 系列验收规格（边界约束+验收用例+接口签名），AI 编码的核心依据。" +
      "返回精简的约束壳，不包含 A 系列流程引导内容。",
    inputSchema: {
      stage: z
        .string()
        .describe("阶段 id（intake / data / contract / arch / implement / verify / release）"),
      scene: z
        .string()
        .optional()
        .describe("场景 id（web / hw），可选"),
    },
  },
  async ({ stage, scene }) => {
    const s = stageMap.get(stage);
    if (!s) {
      return textResult({
        error: `未知阶段 "${stage}"`,
        validStages: stages.map((x) => ({ number: x.number, id: x.id, name: x.name })),
      });
    }
    let sc = null;
    if (scene) {
      sc = sceneMap.get(scene);
      if (!sc) {
        return textResult({
          error: `未知场景 "${scene}"`,
          validScenes: scenes.map((x) => ({ id: x.id, name: x.name })),
        });
      }
    }
    return textResult(buildAcceptanceSpec(s, sc));
  }
);

server.registerTool(
  "list_scenes",
  {
    title: "列出场景扩展",
    description:
      "列出 InspireSpec 支持的场景扩展（Web 前后端 / 软硬件协同）及各自状态。" +
      "用于确认项目适用哪个场景；已明确时可跳过。",
    inputSchema: {},
  },
  async () =>
    textResult({
      scenes: scenes.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
      })),
      hints: [
        "available = 已有场景覆盖内容",
        "用 get_scene_guidance(scene, stage) 获取场景覆盖后的阶段约束包",
      ],
    })
);

server.registerTool(
  "get_scene_guidance",
  {
    title: "获取场景覆盖后的阶段约束包",
    description:
      "获取某场景下某阶段的完整约束包（场景覆盖 > 通用内容）。" +
      "用于 Web 前后端或软硬件协同项目的阶段引导。",
    inputSchema: {
      scene: z
        .string()
        .describe("场景 id，见 list_scenes（web / hw）"),
      stage: z
        .string()
        .describe("阶段 id，见总览（intake / data / contract / arch / implement / verify / release）"),
    },
  },
  async ({ scene, stage }) => {
    const sc = sceneMap.get(scene);
    if (!sc) {
      return textResult({
        error: `未知场景 "${scene}"`,
        validScenes: scenes.map((x) => ({ id: x.id, name: x.name })),
        hint: "用 list_scenes 查看可用场景",
      });
    }
    const s = stageMap.get(stage);
    if (!s) {
      return textResult({
        error: `未知阶段 "${stage}"`,
        validStages: stages.map((x) => ({ number: x.number, id: x.id, name: x.name })),
      });
    }
    return textResult(buildSceneStageContract(sc, s));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[inspire-spec] MCP 服务已启动（stdio）");
