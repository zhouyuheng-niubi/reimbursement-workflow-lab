# 验收标准

## 1. 静态门

必须全部通过：

```bash
mvn -q test -pl reimbursement-admin -am
mvn -q -DskipTests package -pl reimbursement-admin -am
cd web && npx vue-tsc --noEmit
cd web && npm run build
cd mobile && npm run type-check
cd mobile && npm run build:h5
```

## 2. API Smoke

必须覆盖：

- 登录与 `/v1/auth/user-info`
- 主数据：
  - 公司
  - 部门
  - 报销类型
  - 费用类别
  - 项目
- OCR：
  - `/v1/invoices/ocr/status`
  - `/v1/invoices/ocr`
  - `/v1/invoices`
- 报销：
  - 列表
  - 详情
  - 创建
  - 保存草稿
  - 提交
  - 撤回
- 审批：
  - 待审批
  - 历史
  - 通过
  - 驳回
  - 转审
- 付款：
  - 列表
  - 汇总
  - 确认付款
  - 失败
  - 退款
- 报表：
  - `/v1/reports/summary`
- 治理：
  - 系统配置 CRUD

## 3. Web E2E

必须真实覆盖：

- 登录后 30 秒内能找到第一步动作
- OCR 页显示 provider/fallback
- 用 `samples/` 中普通发票和火车票完成识别
- 发票夹可见记录
- 新建报销可从发票夹导入
- 可保存草稿、提交审批
- 详情页可见状态、审批时间线、付款进度
- approver 账号可见待办并完成通过
- 独立样例完成驳回与重提
- 如可行，验证转审
- 审批通过后自动出现付款记录
- 财务完成确认付款
- 独立样例完成付款失败
- 独立样例完成退款
- 汇总卡、列表、详情一致
- 治理页可达
- 隐藏说明页只能从头像下拉进入

## 4. Mobile H5 E2E

必须真实覆盖：

- 登录进入首页
- 首页快捷入口直达拍票/提单/审批
- OCR 页面显示 provider/fallback
- 识别确认页可决定“存夹”或“直接提单”
- 发票夹可带入提单
- 新建报销可提交
- 我的报销列表与详情可查看状态
- 待我审批列表与详情可完成至少一条审批动作
- 我的页和消息中心正常可达

## 5. 业务验收判定

只有同时满足以下条件，才算业务验收通过：

1. 员工能独立完成拍票到提单
2. 审批人能独立完成查看到审批
3. 财务能独立完成待付款到确认/失败/退款
4. Web/Mobile 对同一单据的状态、金额、标签一致
5. 页面中不再散落解释性文案，只有隐藏说明页保留操作解释
6. OCR 真服务正常时走阿里云专用 OCR；失败时 fallback 到 Qwen；两种状态页面都能明确展示

## 6. 最终交付要求

最终必须给出：

- backend 地址
- web 地址
- mobile h5 地址
- 默认登录方式
- 最新报告目录
- 已完成内容
- 剩余非阻断项
