# Daylume（迹伴）2.1

基于 v2.1 总需求文档开始落地的个人智能生活与成长助手。

## 当前产品基线（2026-10-21）

手机优先的个人生活记录产品：随手记下生活，用日历找回日子，在回顾中看见变化。目标主导航为“今天、日历、回顾、我的”，全局“记一笔”是独立动作。学习、饮食、灵感是记录类型；完整目标/任务、开放 AI 问答与 RAG 为 P1。

| 文档 | 用途 |
| --- | --- |
| [v2.1 总需求与技术方案](LifeOS_PRD_Technical_Design_v2.1.md) | 唯一当前需求基线、版本范围与 Java/Python 分工 |
| [竞品参考与产品决策](竞品参考与产品决策.md) | flomo、Day One、Daylio、TickTick 的公开依据与取舍 |
| [前端页面与交互设计](前端页面与交互设计.md) | 手机四 Tab、记录器、日历与回顾的执行规范 |
| [后端 API + DTO 设计](后端%20API%20%2B%20DTO%20设计.md) | 普通记录、日历、原子草稿确认与异步回顾契约 |
| [数据库详细设计](数据库详细设计.md) | P0/P1 表、时间精度、未知热量、幂等与 AI 任务 |

文档描述目标方案；现有代码仍处于逐步实现阶段。v1.0 为历史归档，不能与 v2.1 同时作为开发要求。

## 当前进度

手机优先前端已实现第一版（2026-10-21）：

- 四 Tab 页面：今天、日历、回顾、我的；独立全屏记录器，支持日常/活动/饮食/灵感。
- 正文直接保存、日期补记、标签、可选活动时长、详情、编辑和确认删除。
- IndexedDB 保存记录、习惯与草稿；刷新恢复，保存时原子移除草稿，多标签页版本冲突阻止静默覆盖。
- 月历、跨月选择、类型与关键词搜索、周/月确定性回顾、小习惯打卡/暂停/恢复与历史月历。
- JSON 本机导出；示例数据须主动添加，逐条标注并支持单独移除。
- **当前为本机保存版**，尚未接入登录、Java 云同步与 Python AI。前端不自动把内容发送到旧演示用户接口。
- 核心日期测试通过；手机视口完成记录、草稿恢复、补记、编辑、打卡与导出检查。软件键盘、系统后台与设备存储限制仍需真机验证。

原有后端基础：

- `server/`：Spring Boot 3.5 + Java 17 + Flyway + PostgreSQL 业务后端骨架。
- `ai-service/`：规划中的 Python + FastAPI AI 编排服务；仅接收 Java 内部调用，不直连数据库。
- `frontend/`：React + TypeScript + Vite + React Router；本轮使用轻量原生控件和图标库，保留现有 API 客户端供后续联调。
- `infra/`：PostgreSQL 16 Docker Compose 配置。
- 已实现：统一 `entry` 数据表、演示用户与记录新增/列表基础 API。登录、完整领域接口与新契约仍待接入。

## 环境要求

- Node.js 20+
- Java 17+
- Maven 3.9+
- Python 3.12+（启用 `ai-service/` 后需要）
- Docker Desktop（用于 PostgreSQL）

## 启动 PostgreSQL

```bash
docker compose -f infra/docker-compose.yml up -d
```

## 启动后端

```bash
cd server
mvn spring-boot:run
```

后端默认监听 `http://localhost:8080/api/v1`。当前 W1 使用开发用户 `demo@lifeos.local`，正式登录和权限模块将在下一步接入。

## 启动前端

```bash
cd frontend
npm install
npm run dev
```

不要双击打开 `frontend/index.html`，也不要通过 `file://` 访问；Vite 需要先编译 TSX 模块。启动后打开终端输出的 `http://localhost:5173/`。

开发服务器已将 `/api` 代理到 `http://localhost:8080`；如果后端地址不同，可以设置：

```bash
VITE_API_BASE=http://localhost:8080/api/v1 npm run dev
```

当前本机前端不会自动调用这些 API；该配置保留给后续 Java 联调。若 5173 已被其他进程占用，可以使用 `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`，然后访问对应地址。

前端验证：在 `frontend/` 执行 `npm test` 与 `npm run build`。

如果本机 npm 缓存权限异常，可以使用临时缓存安装依赖：

```bash
NPM_CONFIG_CACHE=/tmp/lifeos-npm-cache npm install --no-audit --no-fund
```

## 下一步

1. 将已完成的本机记录、日历、习惯和回顾流程接入 Java 契约；补齐登录与登录返回恢复。
2. 完成 Spring Security 用户隔离、NOTE 保存、幂等与时间精度；移除正式环境演示用户。
3. 完成服务端日历聚合、按日列表、补记与详情编辑/删除；同步相关迁移。
4. 将可选习惯、活动/轻饮食和确定性周/月回顾替换为真实业务 API，未知热量不计零。
5. 新建 Python FastAPI 服务，实现输入解析、原子草稿确认、持久化 AI 周回顾任务与引用校验。
6. 完成核心后端验证与真实手机的键盘、弱网、后台恢复、权限和可访问性检查，再安排 App/小程序。

