# 示例地区报销智能平台 — AI/OCR 智能模块技术规范

**版本:** 1.1.0
**日期:** 2026-05-26
**适用平台:** 示例地区报销智能平台（银利华 / 耀益 双主体）

---

## 0. 当前落地策略（2026-05-26）

当前系统已经从“单一 OCR provider”升级为“双引擎”运行策略：

- 主路由：`aliyun-ocr`
  - 标准票据优先走阿里云专用票据识别接口
  - 普通发票：`RecognizeInvoice`
  - 火车票：`RecognizeTrainInvoice`
- 兜底：`qwen-vl`
  - 当阿里云专用 OCR 未开通、超时或返回异常时，自动回退到 `qwen-vl-ocr-latest`
- 运维配置：
  - `OCR_PROVIDER=aliyun-ocr`
  - `OCR_FALLBACK_PROVIDER=qwen-vl`
  - `OCR_API_KEY` 仅供 Qwen 兜底使用
  - `OCR_ALIYUN_ACCESS_KEY_ID / OCR_ALIYUN_ACCESS_KEY_SECRET` 供专用票据识别使用

这套策略已经在本地运行态完成验证：

- 普通增值税电子发票 PDF：阿里云专用 OCR 成功识别
- 铁路电子客票 PDF：阿里云专用 OCR 成功识别
- 平台 `/api/v1/invoices/ocr` 已直接写入 `ocr_provider=aliyun-ocr`

---

## 1. OCR 处理流水线

### 1.1 完整流程图（ASCII）

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        OCR 智能识别全流程（示例地区报销平台）                         │
└──────────────────────────────────────────────────────────────────────────────────┘

  用户上传发票
  (POST /api/v1/invoices/ocr)
        │
        ▼
┌───────────────────┐
│   1. 文件接收      │  校验：文件类型(jpg/png/pdf)、大小(≤10MB)、MD5去重
│   File Upload     │  写入 reimbursement_attachment，生成 OSS Key
└────────┬──────────┘
         │  file_path / file_url
         ▼
┌───────────────────┐
│  2. 图像预处理     │  • 灰度化 & 二值化（自适应阈值）
│  Preprocessing    │  • 去噪（高斯滤波）
│                   │  • 透视矫正（四角检测）
│                   │  • 分辨率归一化（≥300 DPI）
│                   │  • 分页拆分（PDF多页→单图）
└────────┬──────────┘
         │  preprocessed_image[]
         ▼
┌───────────────────┐
│  3. OCR 文字识别   │  调用第三方 OCR Provider（阿里云/腾讯云/百度，见第3节）
│  OCR Recognition  │  写入 invoice_recognition.ocr_provider / ocr_request_id
│                   │  识别状态: 0=待识别 → 1=识别中 → 2=成功/3=失败
└────────┬──────────┘
         │  raw_response (JSON)
         ▼
┌───────────────────┐
│  4. 字段结构化提取 │  • 解析 raw_response，映射至标准字段（见第2节）
│  Field Extraction │  • 按发票类型执行对应提取规则
│                   │  • 写入 invoice_recognition 各结构化字段
│                   │  • 商品明细写入 ocr_result 表（按 line_no）
└────────┬──────────┘
         │  structured fields
         ▼
┌───────────────────┐
│  5. 数据校验       │  • 格式校验：发票代码(12位)、日期合法性、税号(15/18位)
│  Validation       │  • 金额校验：price_tax_total = total_amount + tax_amount
│                   │  • 重复发票检测：invoice_code + invoice_no 唯一索引查询
│                   │  • 写入 is_duplicate / duplicate_reimb_id
│                   │  • 发票查验（可选）：调税务局接口，写 verify_status
└────────┬──────────┘
         │  validated result
         ▼
┌───────────────────┐
│  6. 费用类别分类   │  规则引擎 + 关键词匹配（见第4节）
│  Category         │  输出建议 expense_category（TRANSPORT/HOTEL/MEAL/…）
│  Classification   │  写入 suggested_category_code（新增字段或放 raw_response）
└────────┬──────────┘
         │  category_code + confidence
         ▼
┌───────────────────┐
│  7. 异常检测       │  执行第5节规则集（重复票、时间重叠、预算超限、金额异常）
│  Anomaly          │  触发告警写入 operation_log，推送 notification 给财务
│  Detection        │
└────────┬──────────┘
         │  anomaly_flags[]
         ▼
┌───────────────────┐
│  8. 结果持久化     │  • 最终写入 invoice_recognition（recognition_status=2/4）
│  Store            │  • 自动填充 reimbursement_detail（ocr_filled=1）
│                   │  • 置信度写入 confidence 字段
│                   │  • 返回结构化 JSON 给前端（见第8节）
└───────────────────┘
         │
         ▼
  调用方（前端/报销表单）
  自动回填明细行，用户确认后提交
```

### 1.2 关键状态机

```
invoice_recognition.recognition_status:

  ┌─────────┐  submit  ┌──────────┐  provider  ┌──────────┐
  │  0=待识别 │ ───────▶ │ 1=识别中  │ ──────────▶ │ 2=识别成功│
  └─────────┘          └──────────┘            └──────────┘
                              │   error                │  human review
                              ▼                        ▼
                       ┌──────────┐            ┌──────────┐
                       │ 3=识别失败│            │ 4=人工修正│
                       └──────────┘            └──────────┘
```

---

## 2. 支持的发票类型及提取字段

> 对应数据库表 `invoice_recognition`（主字段）+ `ocr_result`（商品明细行）
> 字段符号：✅=必提取  ⚪=条件提取  ❌=不适用

| 字段 | 增值税专用发票 | 增值税普通发票 | 机打发票 | 出租车票 | 火车票 | 飞机行程单 | 过路费发票 | 酒店住宿发票 | 餐饮发票 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **发票代码** `invoice_code` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **发票号码** `invoice_no` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **开票日期** `invoice_date` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **不含税金额** `total_amount` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **税额** `tax_amount` | ✅ | ✅ | ⚪ | ❌ | ❌ | ❌ | ✅ | ⚪ | ⚪ |
| **价税合计** `amount_with_tax` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **销售方名称** `seller_name` | ✅ | ✅ | ✅ | ⚪ | ❌ | ✅(航司) | ✅ | ✅ | ✅ |
| **销售方税号** `seller_tax_no` | ✅ | ✅ | ⚪ | ❌ | ❌ | ❌ | ⚪ | ⚪ | ⚪ |
| **购买方名称** `buyer_name` | ✅ | ✅ | ⚪ | ❌ | ❌ | ✅ | ⚪ | ⚪ | ⚪ |
| **购买方税号** `buyer_tax_no` | ✅ | ⚪ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **校验码** `check_code` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **商品明细** `ocr_result.*` | ✅ | ✅ | ⚪ | ❌ | ❌ | ✅(航段) | ❌ | ✅(房型/夜) | ✅(菜品) |

### 2.1 各类型专有字段补充

**火车票（`invoice_type=6`）**
- 出发地/目的地（存 `raw_response.origin` / `raw_response.destination`）
- 车次号（`raw_response.train_no`）
- 乘车日期、席别（一等座/二等座）
- 票价（→ `amount_with_tax`）

**飞机行程单（`invoice_type=7`）**
- 航班号（`ocr_result.item_name`）
- 起飞/到达城市（`ocr_result.specification`）
- 客票价 + 机场建设费 + 燃油附加费（各行 `ocr_result`）
- 旅客姓名（`raw_response.passenger_name`）

**出租车票（`invoice_type=8`）**
- 上/下车时间（`raw_response.start_time` / `raw_response.end_time`）
- 里程（`raw_response.mileage`）
- 车牌号（`raw_response.plate_no`）

**酒店住宿发票**
- 入住/离店日期（`ocr_result.specification` 行解析）
- 房型、间数、天数（`ocr_result.quantity`）

---

## 3. OCR 服务商对比

| 对比维度 | 阿里云 OCR（专用票据识别） | 腾讯云 OCR（智能结构化识别） | 百度 OCR（增值税发票识别） |
|---|---|---|---|
| **增值税专票识别准确率** | 99.2%（官方） | 99.1%（官方） | 99.0%（官方） |
| **出租车/火车票准确率** | 97–98% | 97–98% | 96–97% |
| **手写/模糊票据** | 较弱，建议阈值 <0.85 时人工复核 | 较弱 | 较弱 |
| **支持发票类型数** | 28 种（含全电发票） | 25 种 | 22 种 |
| **全电发票（UOITP）** | ✅ | ✅ | ✅（2024+） |
| **API 风格** | RESTful，POST JSON body，Token STS 鉴权 | RESTful，POST JSON body，SecretId/Key HMAC 鉴权 | RESTful，POST form-data + AccessToken（OAuth2） |
| **响应时间（P99）** | ~1.2s | ~1.0s | ~1.5s |
| **单价（按调用次）** | ¥0.015/次（>100万 ¥0.010/次） | ¥0.015/次（>100万 ¥0.008/次） | ¥0.015/次（>50万 ¥0.009/次） |
| **免费额度** | 1,000次/月 | 1,000次/月 | 200次/天 |
| **私有化部署** | 支持（云市场采购） | 支持（企业版） | 支持（本地SDK） |
| **发票查验联动** | 需自行对接税务局 API | 需自行对接 | 提供"发票查验"增值接口（单独计费） |
| **数据合规** | 阿里云OSS存储，可选数据不出境 | 腾讯云COS，支持专属集群 | 百度云BOS，支持专有云 |
| **推荐场景** | **当前主 Provider：标准发票/火车票识别主路由** | 腾讯/微信生态集成 | 历史可选方案，不再建议作为当前主 Provider |

> **平台当前配置：** 建议采用 `aliyun-ocr -> qwen-vl` 双路由，标准票据优先用阿里云专用 OCR，复杂/异常票据回退到 Qwen OCR。

---

## 4. 自动分类算法

### 4.1 分类目标

将 OCR 识别结果映射至 `expense_category` 表中的标准类别编码：

| 目标类别 | category_code | 典型发票特征 |
|---|---|---|
| 交通费 | `TRANSPORT` | 火车票、机票、出租车、网约车、地铁 |
| 住宿费 | `HOTEL` | 酒店、住宿、宾馆 |
| 餐费 | `MEAL` | 餐厅、餐饮、饭店 |
| 加油费 | `FUEL` | 加油站、石油、燃油 |
| 过路费 | `TOLL` | 高速、过路、路桥 |
| 采购费用 | `PURCHASE_FEE` | 供应商采购、设备、材料 |

### 4.2 分类流程（优先级由高到低）

```
                  ┌─────────────────────────────────┐
                  │         OCR 结构化结果             │
                  └────────────────┬────────────────┘
                                   │
               ┌───────────────────▼──────────────────┐
               │  Step 1: 发票类型直接映射（最高优先级）  │
               │  invoice_type=6 (火车票)  → TRANSPORT  │
               │  invoice_type=7 (机票行程) → TRANSPORT  │
               │  invoice_type=8 (出租车票) → TRANSPORT  │
               └───────────────────┬──────────────────┘
                                   │ 非上述固定类型
               ┌───────────────────▼──────────────────┐
               │  Step 2: 商品明细关键词匹配             │
               │  匹配 ocr_result.item_name 字段         │
               └───────────────────┬──────────────────┘
                                   │ 无明细或匹配不到
               ┌───────────────────▼──────────────────┐
               │  Step 3: 销售方名称匹配                │
               │  匹配 seller_name 字段                 │
               └───────────────────┬──────────────────┘
                                   │ 仍无结果
               ┌───────────────────▼──────────────────┐
               │  Step 4: 用户历史行为推断              │
               │  取该用户最近30笔同一 seller_name 的   │
               │  reimbursement_detail.category_id     │
               │  选频率最高的 category                │
               └───────────────────┬──────────────────┘
                                   │ 历史无数据
                                   ▼
                              返回 OTHER（人工选择）
                         confidence 降至 0.50 以下
```

### 4.3 关键词规则表（Step 2 & 3）

```json
{
  "TRANSPORT": {
    "keywords": ["铁路", "高铁", "动车", "火车", "航空", "航班", "机场",
                 "出租", "滴滴", "曹操", "网约", "地铁", "公交", "大巴",
                 "客运", "轮渡", "快车", "专车"],
    "item_name_patterns": ["旅客运输", "交通运输", "铁路旅客", "航空运输"]
  },
  "HOTEL": {
    "keywords": ["酒店", "宾馆", "客栈", "旅馆", "住宿", "公寓", "民宿",
                 "Holiday Inn", "如家", "汉庭", "全季", "维也纳"],
    "item_name_patterns": ["住宿", "客房", "房费", "住宿服务"]
  },
  "MEAL": {
    "keywords": ["餐厅", "饭店", "餐饮", "美食", "食堂", "火锅", "烧烤",
                 "快餐", "外卖", "酒楼", "茶楼", "咖啡"],
    "item_name_patterns": ["餐饮服务", "餐费", "饮食", "伙食", "餐食"]
  },
  "FUEL": {
    "keywords": ["中石油", "中石化", "中海油", "加油站", "BP", "壳牌",
                 "中国石油", "中国石化", "燃油"],
    "item_name_patterns": ["汽油", "柴油", "燃油", "加油", "*汽油", "*柴油"]
  },
  "TOLL": {
    "keywords": ["高速", "过路", "路桥", "收费站", "ETC", "通行费"],
    "item_name_patterns": ["通行费", "过路费", "高速费", "路桥费"]
  },
  "PURCHASE_FEE": {
    "keywords": ["科技", "信息", "软件", "硬件", "设备", "材料", "物料",
                 "供应", "贸易", "商贸", "有限公司"],
    "item_name_patterns": ["*设备", "*材料", "*零件", "服务费", "咨询费",
                           "采购", "货物"]
  }
}
```

### 4.4 置信度调整规则

| 条件 | 置信度调整 |
|---|---|
| Step 1 直接映射命中 | confidence = OCR 原始 confidence，最低 0.90 |
| Step 2 item_name 完全匹配 | +0.0（直接采用 OCR confidence） |
| Step 2 关键词匹配 1 个 | −0.05 |
| Step 2 关键词匹配 0 个但 Step 3 命中 | −0.10 |
| Step 4 历史推断（频率 ≥80%） | confidence = 0.75 |
| Step 4 历史推断（频率 50–79%） | confidence = 0.65 |
| 最终降至 OTHER | confidence = 0.50 |

---

## 5. 异常检测规则集

### 5.1 规则一：重复发票检测

**触发时机：** OCR 识别成功后，字段提取阶段（Step 4）同步执行。

**逻辑：**
```sql
SELECT id, reimbursement_id
FROM invoice_recognition
WHERE invoice_code = :invoice_code
  AND invoice_no   = :invoice_no
  AND is_deleted   = 0
  AND id          != :current_id
LIMIT 1;
```

- 若查到记录：写入 `is_duplicate=1`，`duplicate_reimb_id=<找到的报销单ID>`
- 推送 `notification`（notify_type=1）给提交人和财务角色
- 前端显示警告弹窗，阻止直接提交（需人工确认覆盖）

---

### 5.2 规则二：同一用户时间段重叠检测

**适用场景：** 出差报销（reimbursement_type=TRAVEL），防止同一人同一时间段重复报销交通/住宿。

**逻辑：**
```sql
-- 检测新报销单出差时间段是否与现有已提交单重叠
SELECT r.id, r.reimb_no
FROM reimbursement r
WHERE r.applicant_id   = :applicant_id
  AND r.status         NOT IN (4, 5, 7)  -- 排除已驳回、已撤回、已关闭
  AND r.trip_start_date IS NOT NULL
  AND r.trip_end_date   IS NOT NULL
  AND r.trip_start_date <= :new_trip_end
  AND r.trip_end_date   >= :new_trip_start
  AND r.is_deleted      = 0
  AND r.id             != :current_reimb_id;
```

- 若重叠：日志记入 `operation_log`（module='ocr', action='ANOMALY_OVERLAP'）
- 审批节点显示橙色警告标识，不阻断流程，但审批人可见告警信息

---

### 5.3 规则三：预算超限告警

**触发时机：** 报销单提交（POST /reimbursements/{id}/submit）时执行。

**逻辑：**
```sql
-- 项目维度：检查 project_budget
SELECT pb.budget_amount, pb.used_amount, pb.frozen_amount
FROM project_budget pb
WHERE pb.project_id  = :project_id
  AND pb.category_id = :category_id  -- 或汇总所有类别
  AND pb.is_deleted  = 0;

-- 已用 + 冻结 + 本次申请 > budget_amount → 触发告警
```

**告警等级：**

| 使用率 | 告警级别 | 处理方式 |
|---|---|---|
| 80–90% | WARN | 通知项目负责人，继续审批 |
| 90–100% | ALERT | 通知项目负责人 + 财务，继续审批 |
| >100% | BLOCK | 审批流中增加财务总监节点（动态插入），不阻断提交 |

---

### 5.4 规则四：金额异常检测（对比历史均值）

**触发时机：** OCR 字段提取完成后异步执行（不阻塞主流程）。

**逻辑：**
```sql
-- 计算该用户近 6 个月同类别金额的均值和标准差
SELECT AVG(d.amount) AS avg_amount, STDDEV(d.amount) AS std_amount
FROM reimbursement_detail d
JOIN reimbursement r ON r.id = d.reimbursement_id
WHERE r.applicant_id = :user_id
  AND d.category_id  = :category_id
  AND d.expense_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
  AND d.is_deleted   = 0;
```

**异常判定：** 本次金额 > avg_amount + 3 × std_amount（3σ原则）

- 若触发：在 `invoice_recognition.raw_response` 补充 `anomaly_flag: "HIGH_AMOUNT"`
- 在审批页面对该明细行显示"金额偏高"标签
- 财务审核节点必须填写审批意见方可通过（前端强制校验）

---

### 5.5 规则五：发票日期合理性检测

**规则：**
- 发票日期不能晚于提交日期
- 发票日期不能早于报销单关联项目的 `start_date`
- 单笔报销中同一发票代码+号码只能关联一条明细（已由 DB unique key 保障）
- 发票日期与出差时间段（trip_start_date ~ trip_end_date）偏差超过 7 天时警告

---

## 6. 智能审批路由

### 6.1 路由决策矩阵

提交报销单时，系统按以下优先级顺序匹配 `approval_flow_template`（对应表字段：priority 降序）：

```
输入参数：
  - project_id        → 查询项目 leader_user_id（项目负责人）
  - department_id     → 查询部门 leader_user_id（部门负责人）
  - total_amount      → 匹配 amount_min / amount_max
  - reimbursement_type_id
  - company_id

决策流程：

  ┌──────────────────────────────────────────────────┐
  │  SELECT template FROM approval_flow_template     │
  │  WHERE (company_id = :cid OR company_id IS NULL) │
  │    AND (reimb_type_id = :tid OR type IS NULL)    │
  │    AND (amount_min IS NULL OR :amt >= amount_min)│
  │    AND (amount_max IS NULL OR :amt <= amount_max)│
  │    AND status = 1                                │
  │  ORDER BY priority DESC LIMIT 1                  │
  └──────────────────────────────────────────────────┘
              │
              ▼ 获得 template，遍历 approval_flow_node（按 node_order）
              │
  ┌───────────────────────────────────────────────────┐
  │  node_type 解析逻辑                               │
  │                                                   │
  │  1 = 指定人员    → approver_user_id 直接使用       │
  │                                                   │
  │  2 = 指定角色    → 查 user_role 找该角色成员，      │
  │                   结合 department_id 取同部门用户   │
  │                                                   │
  │  3 = 部门负责人  → department.leader_user_id       │
  │                                                   │
  │  4 = 项目负责人  → project.leader_user_id          │
  │                   (project_id 为空时跳过此节点)     │
  │                                                   │
  │  5 = 上级领导    → 查 user.department_id 的父部门   │
  │                   leader_user_id                  │
  │                                                   │
  │  6 = 会签        → 所有指定角色成员均需通过         │
  │                                                   │
  │  7 = 或签        → 任一指定角色成员通过即可         │
  └───────────────────────────────────────────────────┘
```

### 6.2 推荐路由配置示例

| 场景 | 金额区间 | 推荐审批链 |
|---|---|---|
| 普通日常报销 | ≤ 5,000 | 部门负责人 → 财务（FINANCE角色） |
| 出差报销（有项目） | 5,001–20,000 | 项目负责人 → 部门负责人 → 财务 |
| 大额采购 | 20,001–50,000 | 项目负责人 → 部门负责人 → 财务总监 |
| 特大额审批 | > 50,000 | 项目负责人 → 部门负责人 → 财务总监 → 总经理 |
| 预算超限（>100%） | 任意 | 在原链末插入「财务总监」节点（动态） |

### 6.3 超时自动处理（`timeout_action`）

- `timeout_hours` 到期且未处理 → 发送催办 `notification`（notify_type=5）
- 若配置 `timeout_action=1（自动通过）`：自动写入 `approval_record.action=1`，推进到下一节点
- 超时转交（`timeout_action=2`）：改派给 `timeout_transfer_user_id`

---

## 7. OCR 结果置信度评分机制

### 7.1 置信度构成（加权平均）

```
final_confidence = Σ (field_confidence_i × weight_i) / Σ weight_i

关键字段权重分配：
┌───────────────────────┬────────┬──────────────────────────────────┐
│ 字段                  │ 权重   │ 说明                              │
├───────────────────────┼────────┼──────────────────────────────────┤
│ invoice_no            │  0.25  │ 最核心标识字段，错误影响最大       │
│ invoice_code          │  0.20  │ 同上                              │
│ amount_with_tax       │  0.20  │ 金额正确性直接影响报销准确度       │
│ invoice_date          │  0.15  │ 日期合法性影响合规性               │
│ seller_name           │  0.10  │ 销售方可辅助分类                   │
│ buyer_name            │  0.05  │ 购买方核验                        │
│ tax_amount            │  0.05  │ 仅专票/普票有意义                  │
└───────────────────────┴────────┴──────────────────────────────────┘
```

### 7.2 置信度等级与处理策略

| 置信度区间 | 等级 | 颜色 | 处理策略 |
|---|---|---|---|
| 0.95 – 1.00 | 高可信 | 绿色 | 自动填充所有字段，用户仅需确认 |
| 0.80 – 0.94 | 中可信 | 黄色 | 自动填充，低置信字段高亮提示用户复核 |
| 0.60 – 0.79 | 低可信 | 橙色 | 部分填充，强制用户手动核对所有字段 |
| 0.00 – 0.59 | 不可信 | 红色 | 标记 recognition_status=3，转人工录入 |

### 7.3 字段级置信度降分规则

| 触发条件 | 扣分 |
|---|---|
| 金额格式异常（含非数字字符） | −0.30 |
| 发票代码不符合 12 位规范 | −0.20 |
| 税号不符合 15/18 位规范 | −0.10 |
| 日期超出合理范围（未来日期或 >5 年前） | −0.15 |
| 价税合计 ≠ 不含税金额 + 税额（误差 >0.02） | −0.20 |
| OCR Provider 返回置信度本身 < 0.80 | 直接使用 Provider 值 |

### 7.4 人工修正后置信度

当用户或财务手动修改 OCR 字段后：
- `recognition_status` 更新为 `4=人工修正`
- `confidence` 固定设为 `1.00`（人工确认视为最高可信）

---

## 8. OCR 结果数据结构（JSON）

### 8.1 `invoice_recognition` 主记录 JSON 完整结构

```json
{
  "id": 10086,
  "userId": 1001,
  "reimbursementId": null,
  "detailId": null,
  "attachmentId": 2048,
  "originalFileName": "住宿发票_示例地区希尔顿.jpg",
  "filePath": "invoices/2026/05/1001_20260519_143022.jpg",
  "fileUrl": "https://oss.project.com/invoices/2026/05/1001_20260519_143022.jpg",
  "ocrProvider": "aliyun-ocr",
  "ocrRequestId": "34F4AA2A-0A9C-540C-989B-E45545B4EF5D",
  "recognitionStatus": 2,
  "confidence": 0.9340,
  "invoiceType": 2,
  "invoiceTypeName": "增值税普通发票",
  "invoiceCode": "011002100311",
  "invoiceNo": "01234567",
  "invoiceDate": "2026-05-16",
  "checkCode": "123456",
  "buyerName": "银利华有限公司",
  "buyerTaxNo": "91110108MA01XXXXX",
  "sellerName": "示例地区希尔顿酒店管理有限公司",
  "sellerTaxNo": "91110105674321XXXX",
  "totalAmount": 2830.19,
  "taxAmount": 169.81,
  "amountWithTax": 3000.00,
  "currency": "CNY",
  "verifyStatus": 2,
  "verifyAt": "2026-05-19T14:31:05Z",
  "isDuplicate": 0,
  "duplicateReimbId": null,
  "suggestedCategoryCode": "HOTEL",
  "suggestedCategoryConfidence": 0.9700,
  "anomalyFlags": [],
  "rawResponse": {
    "provider": "aliyun-ocr",
    "requestId": "34F4AA2A-0A9C-540C-989B-E45545B4EF5D",
    "providerConfidence": 0.96,
    "rawFields": { "...": "原始 provider 返回字段" }
  },
  "errorMessage": null,
  "createdAt": "2026-05-19T14:30:22Z",
  "updatedAt": "2026-05-19T14:31:05Z"
}
```

### 8.2 `ocr_result` 商品明细行 JSON（数组）

```json
[
  {
    "id": 5001,
    "recognitionId": 10086,
    "lineNo": 1,
    "itemName": "住宿服务*标准大床房",
    "specification": "2026-05-14 至 2026-05-16",
    "unit": "间/夜",
    "quantity": 2.0000,
    "unitPrice": 1415.094340,
    "amount": 2830.19,
    "taxRate": 0.0600,
    "taxAmount": 169.81,
    "confidence": 0.9200,
    "rawText": "住宿服务*标准大床房  间/夜  2  1415.09  2830.19  6%  169.81",
    "createdAt": "2026-05-19T14:30:25Z"
  }
]
```

### 8.3 API 响应标准结构（POST /api/v1/invoices/ocr）

```json
{
  "code": 200,
  "message": "识别成功",
  "data": {
    "id": 10086,
    "recognitionStatus": 2,
    "recognitionStatusLabel": "识别成功",
    "confidence": 0.9340,
    "confidenceLevel": "中可信",
    "invoiceType": 2,
    "invoiceTypeName": "增值税普通发票",
    "invoiceCode": "011002100311",
    "invoiceNo": "01234567",
    "invoiceDate": "2026-05-16",
    "sellerName": "示例地区希尔顿酒店管理有限公司",
    "sellerTaxNo": "91110105674321XXXX",
    "buyerName": "银利华有限公司",
    "buyerTaxNo": "91110108MA01XXXXX",
    "totalAmount": 2830.19,
    "taxAmount": 169.81,
    "amountWithTax": 3000.00,
    "currency": "CNY",
    "items": [
      {
        "lineNo": 1,
        "itemName": "住宿服务*标准大床房",
        "specification": "2026-05-14 至 2026-05-16",
        "unit": "间/夜",
        "quantity": 2.0,
        "unitPrice": 1415.09,
        "amount": 2830.19,
        "taxRate": "6%",
        "taxAmount": 169.81,
        "confidence": 0.9200
      }
    ],
    "suggestedCategory": {
      "code": "HOTEL",
      "name": "住宿费",
      "confidence": 0.9700
    },
    "checkResult": {
      "verifyStatus": 2,
      "verifyStatusLabel": "真票",
      "isDuplicate": false,
      "duplicateReimbNo": null,
      "verifiedAt": "2026-05-19T14:31:05Z"
    },
    "anomalyFlags": [],
    "autoFillSuggestion": {
      "categoryId": 2,
      "categoryCode": "HOTEL",
      "amount": 3000.00,
      "expenseDate": "2026-05-16",
      "description": "示例地区希尔顿酒店管理有限公司 住宿费",
      "vendorName": "示例地区希尔顿酒店管理有限公司",
      "invoiceNo": "01234567",
      "invoiceCode": "011002100311",
      "invoiceType": 2,
      "hasInvoice": 1,
      "ocrFilled": 1
    },
    "imageUrl": "https://oss.project.com/invoices/2026/05/1001_20260519_143022.jpg",
    "createdAt": "2026-05-19T14:30:22Z"
  }
}
```

### 8.4 异常检测 anomalyFlags 结构

```json
"anomalyFlags": [
  {
    "type": "DUPLICATE_INVOICE",
    "severity": "ERROR",
    "message": "该发票已在报销单 RB-2026-00055 中使用",
    "relatedReimbNo": "RB-2026-00055",
    "relatedReimbId": 55
  },
  {
    "type": "HIGH_AMOUNT",
    "severity": "WARN",
    "message": "本次金额 ¥3,000 高于您近6个月住宿费均值 ¥892 的 3σ 范围",
    "avgAmount": 892.00,
    "stdAmount": 310.50,
    "threshold": 1823.50
  },
  {
    "type": "BUDGET_OVERRUN",
    "severity": "ALERT",
    "message": "项目 PRJ-2026-001 住宿费预算使用率已达 95.2%",
    "budgetAmount": 50000.00,
    "usedAmount": 47600.00,
    "currentRequest": 3000.00
  }
]
```

---

## 9. 数据库扩展说明

以下字段建议在现有表基础上补充，以完整支持本规范：

### `invoice_recognition` 新增字段

```sql
-- 建议追加至现有 invoice_recognition 表
ALTER TABLE `invoice_recognition`
  ADD COLUMN `suggested_category_code`       VARCHAR(64)  DEFAULT NULL  COMMENT 'AI建议费用类别编码' AFTER `amount_with_tax`,
  ADD COLUMN `suggested_category_confidence` DECIMAL(5,4) DEFAULT NULL  COMMENT 'AI分类置信度(0~1)' AFTER `suggested_category_code`,
  ADD COLUMN `anomaly_flags`                 JSON         DEFAULT NULL  COMMENT '异常检测标志列表'    AFTER `suggested_category_confidence`;
```

### `system_config` 建议新增 OCR 配置项

```sql
INSERT INTO `system_config` (`config_group`, `config_key`, `config_value`, `value_type`, `config_name`, `is_system`) VALUES
('ocr', 'ocr_fallback_provider',     'aliyun',  'STRING',  'OCR备用服务商',          1),
('ocr', 'ocr_confidence_threshold',  '0.80',    'NUMBER',  'OCR置信度人工复核阈值',  1),
('ocr', 'ocr_auto_classify',         'true',    'BOOLEAN', 'OCR自动费用分类开关',    1),
('ocr', 'anomaly_sigma_multiplier',  '3',       'NUMBER',  '金额异常检测σ倍数',      1),
('ocr', 'anomaly_history_months',    '6',       'NUMBER',  '金额异常检测历史月数',   1),
('ocr', 'budget_warn_threshold',     '0.80',    'NUMBER',  '预算告警阈值(80%)',      1),
('ocr', 'budget_alert_threshold',    '0.90',    'NUMBER',  '预算告警阈值(90%)',      1);
```

---

## 10. 非功能性要求

| 指标 | 目标值 |
|---|---|
| OCR 识别响应时间（P95） | ≤ 3 秒（含网络往返） |
| OCR 识别响应时间（P99） | ≤ 5 秒 |
| 字段提取准确率（增值税票） | ≥ 98% |
| 字段提取准确率（出租车/火车票） | ≥ 95% |
| 异常检测误报率 | ≤ 2% |
| 自动分类准确率 | ≥ 92%（基于历史数据验证） |
| OCR 并发处理能力 | ≥ 50 req/s（峰值） |
| 图片存储（OSS） | 保留 10 年（合规要求） |
| Provider 切换 Failover 时间 | ≤ 3 秒自动重试备用 Provider |
