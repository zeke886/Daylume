# Daylume（迹伴）v2.1 后端 API + DTO 设计

更新：2026-10-21 · 手机优先执行基线  
依据：[总需求](LifeOS_PRD_Technical_Design_v2.1.md)。本文是目标契约；现有 Java 基础接口需要逐步迁移，不能将下列端点视为均已实现。

## 1. 服务职责与通用约定

### 1.1 Java / Python 边界

客户端仅访问 Java /api/v1。Java 负责登录、用户隔离、领域事务、日历/统计、幂等、任务、持久化与 AI 授权。Python FastAPI 只处理结构化解析与回顾生成，无 PostgreSQL 凭据，不接受公网客户端请求。

P0 Java 把已筛选、已聚合、大小有界的事实传给 Python，不需要 Agent 回调数据库。P1 问答才增加 Java 内部只读工具 API。模型不能指定 userId、SQL、文件路径、任意 URL 或写接口。

Web 使用同域 Session + HttpOnly + Secure Cookie，写接口启用 CSRF。App/小程序令牌在渠道接入时补充；所有渠道最终使用同一个 app_user。对客户端隐藏 DemoCurrentUser、模型密钥与内部凭据。

### 1.2 响应、日期与错误

成功为 ApiResponse<T>：code、message、data、traceId；失败同样返回 code/message/traceId，可带 fieldErrors。204 无响应体但保留 traceId 响应头。错误消息不暴露其他用户是否拥有资源。

分页为 items/page/pageSize/total；P0 默认 page=1/pageSize=20，上限 100。时间戳为 ISO-8601 带偏移；自然日为 YYYY-MM-DD。区间统一 [from,toExclusive)，不混用包含式 to。周一为周起点。

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | 字段、枚举或日期非法 |
| 401 | UNAUTHENTICATED | 未登录 |
| 403 | AI_NOT_ALLOWED / FORBIDDEN | AI 未授权或操作不被允许 |
| 404 | NOT_FOUND | 不存在或不属于当前用户 |
| 409 | CONFLICT / IDEMPOTENCY_CONFLICT | 版本冲突，或同键不同请求体 |
| 409 | REVIEW_STALE | 回顾依据已改变，需要重新生成 |
| 410 | DRAFT_EXPIRED | 草稿已过期，需要重新整理或手动保存 |
| 422 | BUSINESS_RULE_VIOLATION | 日期/状态/领域规则不允许 |
| 429 | RATE_LIMITED | 超出请求或 AI 成本预算 |
| 503 | AI_UNAVAILABLE | Python/模型不可用；非 AI 请求继续可用 |

### 1.3 写入与隐私

- 所有创建/确认请求带 Idempotency-Key；服务端按 userId + operation + key 去重。相同键和同内容返回原结果，不同内容返回 409。
- 记录编辑使用 version/If-Match，冲突保留客户端输入，不静默覆盖。
- 身份只由登录上下文/内部签名上下文产生，DTO 不接受客户端 userId。
- 新账号 aiOptIn=false。aiAllowed 省略时继承用户当时设置；用户总开关关闭时单条 true 也不能外发。
- 区分正式写入、AI 草稿、本机草稿。客户端 IndexedDB 内容不等于服务端 entry。

## 2. 手机首页、日历和回顾 DTO

下列 record 为契约轮廓；实现时为 nullable/version 等字段使用包装类型和明确的校验器，避免 @NotNull 标注 primitive 无效。

```java
public record TodayResponse(
    LocalDate date, String zoneId, List<EntryResponse> recentEntries,
    int remainingEntryCount, List<HabitTodayResponse> habits,
    int remainingHabitCount, String lightSummary) {}

public record HabitTodayResponse(
    UUID id, String name, boolean checkedIn, int weekCheckinCount,
    int targetPerWeek, String status) {}

public record CalendarDayResponse(
    LocalDate date, long entryCount, Map<EntryType, Long> countsByType,
    long habitCheckinCount) {}

public record CalendarMonthResponse(
    YearMonth month, String displayZoneId, List<CalendarDayResponse> days) {}

public record PeriodSummaryResponse(
    LocalDate from, LocalDate toExclusive, int recordedDays, long entryCount,
    long activityMinutes, long habitCheckinCount,
    BigDecimal knownCaloriesKcal, int unknownCalorieItemCount, int unknownMealCount,
    List<UUID> highlightEntryIds, String dataScope) {}

public record EntryListQuery(
    LocalDate from, LocalDate toExclusive, EntryType type,
    String keyword, List<String> tags, Integer page, Integer pageSize) {}
```

today 默认预览 5 条记录、3 个习惯，并返回剩余数。所有摘要由 Java 计算；lightSummary 可确定性拼接，不调用模型。

calendar/months 接收 month=YYYY-MM、type 和 tags，按相同筛选统计整月；零记录日仍返回 entryCount=0。entryCount 只算 entry，habitCheckinCount 独立；筛选记录类型时习惯计数不并入其结果。entry 的归属按固化 local_date，不能按当前时区重新分桶。

summary 的确定性数据范围是当前用户全部相应记录，标为 ALL_USER_RECORDS；AI 结果单独标为 AI_AUTHORIZED_RECORDS。没有可计算饮食项时 knownCaloriesKcal=null，存在已知零值时可为 0，并始终返回未知数量。

## 3. 记录 DTO 与校验

### 3.1 公共内容与时间

```java
public enum TimePrecision { INSTANT, DATE }

public record OccurrenceInput(
    TimePrecision precision, Instant occurredAt, LocalDate localDate) {}

public record CreateNoteRequest(
    String rawText, String title, OccurrenceInput occurrence,
    List<String> tags, Boolean aiAllowed) {}

public record EntryResponse(
    UUID id, EntryType type, String title, String rawText, String content,
    Instant occurredAt, LocalDate localDate, String occurrenceZoneId,
    TimePrecision timePrecision, EntrySource source, boolean aiAllowed,
    List<String> tags, long version, Instant updatedAt) {}

public record PatchEntryRequest(
    String title, String content, OccurrenceInput occurrence,
    Boolean aiAllowed, List<String> tags, Long version) {}
```

- NOTE/IDEA 必须有非空正文，最多 5000 字；标题可选，最多 200 字，省略时由 Java 截取正文，禁止为此调用 AI。
- occurrence 省略为当前时间 INSTANT。INSTANT 要求精确时间，localDate 由 Java 计算；DATE 要求 localDate，Java 生成当日中午的 UTC 锚点并记录精度，前端只显示日期。
- P0 不允许 future localDate，精确时间允许有限时钟误差；非法时区由服务端拒绝。
- timePrecision、occurrenceZoneId、localDate 必须一起保持一致。用户时区改变不移动旧记录。
- tags 最多 10 个，单个 50 字，去重 trim；aiAllowed 不能绕过用户总开关。

### 3.2 活动、饮食、灵感与习惯

```java
public record CreateActivityRequest(
    String title, String rawText, ActivityType activityType,
    OccurrenceInput occurrence, Integer durationMinutes,
    String content, String takeaway, List<String> tags, Boolean aiAllowed) {}

public record MealItemRequest(
    UUID foodId, String foodName, BigDecimal amount, String unit,
    BigDecimal weightG) {}

public record CreateMealRequest(
    String rawText, String title, MealType mealType,
    OccurrenceInput occurrence, List<MealItemRequest> items,
    List<String> tags, Boolean aiAllowed) {}

public record MealItemResponse(
    UUID id, String foodName, BigDecimal amount, String unit,
    BigDecimal weightG, BigDecimal caloriesKcal,
    boolean estimated, String source) {}

public record MealResponse(
    EntryResponse entry, MealType mealType, List<MealItemResponse> items,
    BigDecimal knownCaloriesKcal, int unknownCalorieItemCount, int unknownMealCount,
    boolean partialRecord) {}

public record DailyNutritionResponse(
    LocalDate date, BigDecimal knownCaloriesKcal,
    int unknownCalorieItemCount, int unknownMealCount,
    boolean partialRecord, List<MealResponse> meals) {}

public record CreateIdeaRequest(
    String rawText, String title, OccurrenceInput occurrence,
    List<String> tags, Boolean aiAllowed) {}

public record CreateHabitRequest(
    String name, Integer targetPerWeek, LocalDate startDate, LocalDate endDate) {}

public record CheckinRequest(LocalDate date, String note) {}
```

活动要求标题/正文至少一项；时长选填，填写时 1–1440 分钟。IDEA 默认 INBOX，完整状态流程为 P1。MEAL 必须有原文或至少一个食物名，mealType 可 UNKNOWN，amount/unit/weight 选填；填写数值时必须为正，不将未知默认为一份。

caloriesKcal 只由 Java 根据有效食品匹配与份量计算；没有依据时为 null/source=UNKNOWN。食品默认份量若被使用必须有来源并标为 estimated，模型估值不能充当营养事实。餐次与当日汇总提供 known/unknown 信息，partialRecord 固定说明这是已记录部分。只有原文且无明细的餐次计入 unknownMealCount，不伪装成没有未知热量。

习惯名称 1–100 字，targetPerWeek=1..7；周目标不等于指定星期。补卡不晚于今天且不早于 startDate；暂停/归档保留历史。周完成比例为 min(次数/目标,1)，实际次数另返回，不折损原始事实。

### 3.3 AI 草稿与原子确认

```java
public record EntryDraftRequest(
    String text, OccurrenceInput occurrenceHint) {}

public record DraftBatchResponse(
    UUID batchId, Long version, String originalText,
    List<EntryDraftResponse> drafts, Instant expiresAt) {}

public record EntryDraftResponse(
    UUID draftId, EntryType type, JsonNode payload,
    List<String> uncertainties) {}

public record ConfirmDraftItem(
    UUID draftId, EntryType type, JsonNode editedPayload) {}

public record ConfirmDraftBatchRequest(
    Long version, List<ConfirmDraftItem> selectedDrafts) {}

public record ConfirmDraftBatchResponse(
    UUID batchId, List<UUID> entryIds, String status) {}
```

草稿最多 10 条，原文最多 5000 字；payload 按 type 使用固定 JSON Schema，禁止额外属性。Python 与 Java 分别校验，Java 再完成日期、食品与所有权校验。batchId/draftId、用户归属和过期时间均由 Java 生成。

确认只接受该 batch 的 draftId，可勾选部分并修改内容；空选择拒绝。一次事务写入所有选中 entry + detail + tags，同时标记 batch CONFIRMED。任何条目无效则整体不写。已确认 batch 再次确认返回原 entryIds；不同内容或版本返回 409。

### 3.4 回顾任务

```java
public record CreateWeeklyReviewRequest(
    LocalDate weekStart, String regenerateReason) {}

public record AiJobResponse(
    UUID jobId, String status, UUID reportId,
    String errorCode, Instant updatedAt, Integer retryAfterSeconds) {}

public record AiReviewResponse(
    UUID id, LocalDate from, LocalDate toExclusive, String dataScope,
    int includedEntryCount, int excludedEntryCount, Map<String, Integer> excludedByReason,
    boolean contextTruncated, String status,
    List<ReviewObservation> observations, List<EvidenceRef> evidence,
    Instant generatedAt) {}

public record EvidenceRef(UUID entryId, String title, LocalDate localDate) {}

public record ReviewObservation(
    String kind, String text, List<UUID> evidenceEntryIds) {}
```

weekStart 必须周一。任务创建返回 202；重复键复用原 jobId；相同周期、数据版本、授权版本与工作流版本可复用既有有效报告。显式重算使用新的幂等键，并受周期配额限制。没有授权正文时不发送模型请求，返回说明性空结果。

## 4. 对外 REST 路由

统一前缀 /api/v1；未标注阶段的均为 P0。CSRF 获取与登录端点按同域 Spring Security 配置对齐。

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| GET | /auth/me | 当前登录用户与时区/AI 设置 |
| POST | /auth/register、/auth/login、/auth/logout | 注册/登录/退出 |
| GET | /auth/csrf | 获取写请求 CSRF token |
| PATCH | /me/preferences | 时区、AI 授权；撤销时推进隐私版本 |
| GET | /today | TodayResponse；手机首页聚合 |
| GET | /calendar/months?month= | CalendarMonthResponse；类型/标签可选 |
| GET | /entries | 日期范围、类型、关键词、标签分页 |
| POST | /entries | 创建 NOTE |
| GET/PATCH/DELETE | /entries/{id} | 详情、编辑、删除 |
| POST | /activities、/meals、/ideas | 创建类型记录 |
| PATCH | /activities/{entryId}、/meals/{entryId}、/ideas/{entryId} | 修改领域明细 |
| GET | /nutrition/daily?date= | 已知热量、未知条目与餐次 |
| GET | /foods/search?q= | 少量内置/已有食品，允许无结果 |
| GET/POST | /habits | 习惯列表/创建 |
| GET/PATCH | /habits/{id} | 详情、周目标、暂停/归档 |
| GET | /habits/{id}/checkins?from=&toExclusive= | 月历历史 |
| POST | /habits/{id}/checkins | 幂等打卡 |
| DELETE | /habits/{id}/checkins/{date} | 撤销，重复撤销仍成功 |
| GET | /reviews/summary?from=&toExclusive= | 确定性周/月回顾 |
| POST | /ai/entry-drafts | 解析并创建 DraftBatchResponse |
| POST | /ai/draft-batches/{id}/confirm | 原子保存选中草稿 |
| POST | /ai/reports/weekly | 创建异步回顾任务，202 + AiJobResponse |
| GET | /ai/jobs/{id} | 当前用户任务状态 |
| POST | /ai/jobs/{id}/cancel | 尽力取消，不能承诺撤回外部请求 |
| GET | /ai/reports、/ai/reports/{id} | 历史列表与有效报告 |
| POST/GET | /me/exports、/me/exports/{id} | 创建/查询受鉴权保护的导出任务 |
| DELETE | /me | 二次确认后的账户删除 |

已有 /dashboard/today 可暂作 /today 兼容别名，但返回相同资源语义；旧参数 to 在迁移适配层显式转换，不直接混入新接口。

P1 才开放 /ai/ask、/goals、/tasks、/recommendations、/agent-actions、/foods 管理、相似灵感、设备令牌和完整同步。界面隐藏未实现能力；有数据表不等于该 API 已开放。

## 5. 内部 AI 契约

### 5.1 Java → Python

内部前缀 /internal/ai/v1，不经公网 Nginx 转发。Java 使用专用 audience 的短期签名凭据，Python 校验签名、过期和调用方。凭据中的用户范围由 Java 注入，不能来自模型。

| 方法 | 内部路径 | 请求/返回 |
| --- | --- | --- |
| POST | /parse-entries | ParseContext → DraftCandidate[] |
| POST | /generate-weekly-review | ReviewContext → ReviewCandidate |
| GET | /health | 进程健康；单独上报模型依赖状态 |

公共上下文：contractVersion、traceId、requestId、deadlineAt、now、zoneId、privacyRevision、workflowVersion。模型密钥仅在 Python 环境注入。ParseContext 仅携带当前原文和发生时间提示；ReviewContext 携带 Java 已计算 facts、允许的 evidenceId/entryId 与截断正文、样本覆盖范围。

周回顾上下文初始上限为 200 条证据、单条 1000 字、总正文 50000 字，并受供应商 token 预算再次限制。超限按确定性抽样策略选取，返回 contextTruncated=true、实际参与数量与省略原因；facts 仍基于明确的完整统计范围，不能让模型把样本正文描述为全部历史。

ReviewCandidate 返回 observations（文字、evidenceIds、kind）、suggestions、modelId、workflowVersion、usage。展示的数字事实由 Java 的 facts 渲染；Java 拒绝未知 evidenceId、越权引用与非法字段。自由文本可能仍存在模型幻觉，须靠限定输出、引用验证和固定评测约束，不宣称 schema 能证明语义真实性。

P1 只读工具入口为 Java /internal/tools/v1/{toolName}，只允许预注册统计/检索工具。Python 以短期调用上下文凭据请求，Java 校验 audience、用户、工具范围、到期和调用预算，不能仅凭可修改的 body.userId 授权。

### 5.2 超时、重试与容量

记录解析初始预算 15 秒、最多一次有预算的模型尝试；Java/客户端超时逐层留余量，参数可经测量调整。Python 请求必须异步友好，并限制并发、输入长度、总 tokens 与响应体大小。

周回顾由 Java 领取 ai_job 后调用 Python，工作 deadline 和租约明确；失败按错误类别做有界重试，复用 requestId，记录 attempt 和成本。连接超时不能触发浏览器/Java/Python 三层独立重试。

ai_job 使用原子 claim、lease_until 和最大尝试次数；实例崩溃后过期租约可恢复。成功持久化需要校验仍为当前租约持有者；过期 worker 的晚到结果不得覆盖新任务。P0 无需 MQ。

## 6. 核心事务与权限流程

手动保存：鉴权 → 参数校验 → 幂等占位 → entry+detail+tags 事务 → 返回确定结果；失败不留下成功幂等记录。数据库唯一约束兜底并发。

AI 确认：鉴权 → 校验 batch 所属/未过期/版本 → 逐条领域校验 → 原子提交 → 记录确认结果。确认属于用户明确手动动作；总 AI 开关关闭不阻止用户手动保存已得到的文本，但不得继续外发。

回顾任务：Java 按用户与周期准备事实和授权证据 → 创建 job → 执行前校验 privacyRevision → Python 生成 → 写回前重新校验授权与依赖 → 保存 report/引用。撤销授权或删除记录后，使依赖报告失效、任务取消/失败并清理派生正文，不返回旧摘要。

日历、摘要与列表共用日期/用户/过滤条件。meal 明细修改后在同事务内重算快照，聚合从已提交数据读取；删除不残留统计。P1 行动执行必须经过单独确认端点与事务，Python 不具写权限。

## 7. 验收与跨端

必须验证：普通文字无标题可保存；日期精度与补记归属正确；六行月份聚合正确；未知热量不计零；重复保存/确认不重复；并发版本返回 409；多草稿任一无效时无部分写入；退出登录不泄漏旧缓存；AI 关闭或不可用不影响基础 API。

AI 验收包含：伪造内部用户范围拒绝、引用越权拒绝、授权变更使旧任务/结果失效、任务重启恢复、旧租约写回拒绝、不同幂等内容拒绝。traceId 贯穿 Java/Python，普通日志无私密正文。

小程序/App 继续共用 /api/v1，不复制业务路由。P1 增加 auth_identity、设备令牌与 cursor/sync；刷新令牌仅保存 hash。完整离线队列需要版本冲突与删除变更记录，不能凭 updated_at 列表就声称实现增量同步。
