# 运行手册

## 1. 仓库路径

`<LOCAL_PATH>`

## 2. 启动与停止

### 启动

```bash
./start.sh
```

默认会启动：

- backend：`18760`
- web：`18761`
- mobile h5：`18762`

### 停止

```bash
./stop.sh
```

## 3. 健康检查

### 后端

```bash
curl http://127.0.0.1:18760/api/actuator/health
```

### Web

```bash
curl -I http://127.0.0.1:18761
```

### Mobile H5

```bash
curl -I http://127.0.0.1:18762/
```

## 4. 默认地址

- backend：`http://127.0.0.1:18760/api`
- web：`http://127.0.0.1:18761`
- mobile h5：`http://127.0.0.1:18762/#/`

## 5. 默认账号

- 管理员账号：`admin`
- 管理员密码：`admin123`

如需审批链与财务链验证，应同时检查是否存在：

- approver 账号
- finance 账号

## 6. 日志位置

- 后端日志：`runtime/logs/backend.log`
- Web 日志：`runtime/logs/frontend.log`
- Mobile H5 日志：`runtime/logs/mobile-h5.log`

## 7. 样例票据

样例目录：

`samples/`

用于 OCR 与端到端验证的真实样例包括普通发票、火车票等。

## 8. 统一回归入口

```bash
./scripts/run_full_regression.sh
```

职责：

- 启动环境
- 执行后端测试
- 执行 Web/Mobile 静态门
- 执行 API smoke
- 执行 Web Playwright
- 执行 Mobile H5 Playwright
- 输出统一报告

## 9. 报告目录

统一报告输出到：

`runtime/reports/`

最新一次 full closure 结果目录形如：

`runtime/reports/full-closure-YYYYMMDD-HHMMSS/`

重点文件：

- `summary.md`
- `commands.log`
- `manifest.json`
- `web/`
- `mobile/`

## 10. 验证顺序建议

建议按以下顺序执行：

1. `./stop.sh`
2. `./start.sh`
3. 健康检查
4. `./scripts/run_full_regression.sh`
5. 打开 Web 与 Mobile H5 页面人工抽验

## 11. 风险与边界

- 不要清库
- 不要删除现有业务数据
- 只做增量修复
- 不要更改既有后端 API 路径与语义
- 如果 OCR 真服务异常，必须验证 fallback，而不是直接跳过 OCR 验收
