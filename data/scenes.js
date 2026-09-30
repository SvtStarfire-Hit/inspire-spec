/**
 * 场景扩展（SceneExtension）—— 结构定义见 docs/10-数据契约.md §3
 *
 * stageOverrides：对通用阶段内容的"字段级覆盖"（只写要改的字段，其余继承 data/stages.js）。
 * 覆盖策略：数组字段为整体替换，非数组字段为浅合并。
 * 当前已有场景：web（Web 前后端）、hw（软硬件协同）。
 */
export const scenes = [
  {
    id: "web",
    name: "Web 前后端场景",
    description: "面向 Web 前后端分离架构，强化 API 契约、数据库 Schema、认证授权",
    status: "available",
    stageOverrides: {
      contract: {
        deliverables: [
          { name: "API 契约", description: "RESTful/GraphQL 接口定义（方法/路径/请求体/响应体/错误码）" },
          { name: "数据库 Schema", description: "表结构、索引、迁移脚本" },
          { name: "核心流程时序图", description: "前后端调用时序（含异常路径）" },
        ],
        rules: [
          "API 契约必须包含 HTTP 方法/路径/请求体/响应体/错误码",
          "数据库变更必须有迁移脚本（可追踪、可回滚）",
          "每张时序图至少包含一个异常分支",
          "认证方案必须明确 Token 生命周期和前端处理方式",
        ],
        pitfalls: [
          "API 不写错误码规范（前端无法统一处理）",
          "数据库 Schema 与数据字典不一致",
          "认证过期/无权限/参数错误没有统一处理",
          "前后端类型不共享（DTO 各写各的）",
        ],
      },
      arch: {
        deliverables: [
          { name: "架构 4+1 视图", description: "用例/逻辑/开发/进程/物理（含前后端分层）" },
          { name: "需求追踪矩阵 RTM", description: "需求→设计→API→代码→测试" },
          { name: "任务清单", description: "含依赖关系，前后端可并行的任务标注清楚" },
        ],
        rules: [
          "物理视图必须包含前端部署方式（CDN/SSR/静态托管）",
          "进程视图必须包含 API 网关/中间件层",
          "RTM 中每条需求必须追踪到具体 API 端点",
        ],
      },
    },
  },
  {
    id: "hw",
    name: "软硬件协同场景",
    description: "面向含硬件设备、边缘计算、现场部署的项目，强化设备契约和异常恢复",
    status: "available",
    stageOverrides: {
      intake: {
        deliverables: [
          { name: "设计资产清单", description: "清点功能蓝图、界面稿、设计令牌等" },
          { name: "PRD 产品需求文档", description: "范围/角色/功能/验收标准/非功能需求" },
          { name: "差距报告", description: "工程维度差距与处置建议" },
          { name: "硬件/部署初始条件", description: "设备型号、固件、驱动、部署环境初始信息" },
        ],
        rules: [
          "先清点再分析",
          "验收标准必须可验证",
          "硬件条件必须在 PRD 阶段就记录，不能留到现场",
          "差距报告必须按工程维度分类",
        ],
      },
      data: {
        deliverables: [
          { name: "数据字典", description: "实体/字段/类型/约束/默认值/语义" },
          { name: "设备数据字典", description: "上报字段、单位、范围、采样周期、精度" },
          { name: "ER 图", description: "Mermaid erDiagram" },
          { name: "通用约束与业务规则", description: "编号/等级/影响模块/测试点" },
        ],
        rules: [
          "设备数据字段必须标注单位、量纲、范围、采样周期",
          "布尔字段必须写清 true/false 的精确定义",
          "状态字段优先使用枚举而非布尔",
          "通用约束必须集中编号",
        ],
      },
      contract: {
        deliverables: [
          { name: "接口/API/设备契约", description: "输入/输出/副作用/异常/权限/幂等性" },
          { name: "设备通信契约", description: "协议/端口/认证/心跳/超时/重试/幂等/缓存" },
          { name: "设备状态机", description: "在线/离线/故障/恢复/升级/维护" },
          { name: "核心流程时序图", description: "含设备交互的完整时序" },
        ],
        rules: [
          "设备通信契约必须包含心跳/超时/重试/幂等/离线缓存",
          "设备状态机必须包含离线、故障、恢复状态",
          "每张时序图至少包含一个异常分支",
          "接口契约必须覆盖副作用和幂等性",
        ],
      },
      arch: {
        rules: [
          "物理视图必须包含设备、边缘、中心三层拓扑",
          "进程视图必须包含断网缓存和补传策略",
          "物理视图必须标注网络、端口、驱动、模型运行时",
        ],
      },
      verify: {
        deliverables: [
          { name: "测试报告", description: "按 RTM 逐项对照结果" },
          { name: "缺陷清单", description: "含严重度分级和根因分类" },
          { name: "现场验收清单", description: "设备连通、压力、恢复、回滚" },
        ],
        rules: [
          "现场验收必须包含断网、断电、离线、重启恢复测试",
          "按 RTM 逐项验证",
          "缺陷必须分类根因",
        ],
      },
      release: {
        rules: [
          "发布清单必须包含回滚方案",
          "必须包含现场验收步骤",
          "经验必须区分项目特定和方法论改进",
        ],
      },
    },
  },
];
