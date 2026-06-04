#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError as exc:  # pragma: no cover
    raise SystemExit("python requests 未安装，无法执行 API smoke") from exc


ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "samples"
API_BASE = os.environ.get("REIMBURSEMENT_API_BASE", "http://127.0.0.1:18760/api")
MYSQL_BIN = os.environ.get("MYSQL_BIN", "mysql")
MYSQL_USER = os.environ.get("MYSQL_USER", "root")
MYSQL_PASSWORD = <REDACTED_CREDENTIAL>
MYSQL_DB = os.environ.get("MYSQL_DB", "reimbursement_db")
ADMIN_USER = os.environ.get("ADMIN_USER", "admin")
ADMIN_PASSWORD = <REDACTED_CREDENTIAL>
APPROVER_USER = os.environ.get("APPROVER_USER", "approver")
APPROVER_PASSWORD = <REDACTED_CREDENTIAL>

ORDINARY_SAMPLE = SAMPLES / "dzfp_26512000002165328481_示例地区中油鸿华能源有限公司_20260525162018.pdf"
TRAIN_SAMPLE = SAMPLES / "26510000000000415544-电子发票 (1).pdf"


class SmokeError(RuntimeError):
    pass


def _json_safe(data: Any) -> Any:
    if isinstance(data, Decimal):
        return float(data)
    if isinstance(data, Path):
        return str(data)
    if isinstance(data, dict):
        return {k: _json_safe(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_json_safe(item) for item in data]
    return data


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(_json_safe(payload), ensure_ascii=False, indent=2), encoding="utf-8")


@dataclass
class Client:
    username: str
    password: str
    session: requests.Session
    access_token: str | None = None
    user_info: dict[str, Any] | None = None

    def login(self) -> None:
        response = self.session.post(
            f"{API_BASE}/v1/auth/login",
            json={"username": self.username, "password": self.password},
            timeout=60,
        )
        payload = response.json()
        if payload.get("code") not in (0, 200):
            raise SmokeError(f"{self.username} 登录失败: {payload}")
        data = payload["data"]
        self.access_token = data["accessToken"]
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
        self.user_info = self.get("/v1/auth/user-info")

    def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        response = self.session.get(f"{API_BASE}{path}", params=params, timeout=120)
        return parse_response(response, f"GET {path}")

    def post(self, path: str, json_body: dict[str, Any] | None = None, params: dict[str, Any] | None = None) -> Any:
        response = self.session.post(f"{API_BASE}{path}", json=json_body, params=params, timeout=180)
        return parse_response(response, f"POST {path}")

    def put(self, path: str, json_body: dict[str, Any]) -> Any:
        response = self.session.put(f"{API_BASE}{path}", json=json_body, timeout=180)
        return parse_response(response, f"PUT {path}")

    def delete(self, path: str) -> Any:
        response = self.session.delete(f"{API_BASE}{path}", timeout=120)
        return parse_response(response, f"DELETE {path}")

    def upload(self, path: str, file_path: Path) -> Any:
        suffix = file_path.suffix.lower()
        mime = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
        }.get(suffix, "application/pdf")
        with file_path.open("rb") as fh:
            response = self.session.post(
                f"{API_BASE}{path}",
                files={"file": (file_path.name, fh, mime)},
                timeout=300,
            )
        return parse_response(response, f"UPLOAD {path}")


def parse_response(response: requests.Response, action: str) -> Any:
    try:
        payload = response.json()
    except Exception as exc:
        raise SmokeError(f"{action} 返回非 JSON: {response.status_code} {response.text[:300]}") from exc
    if response.status_code >= 400:
        raise SmokeError(f"{action} HTTP {response.status_code}: {payload}")
    if payload.get("code") not in (0, 200):
        raise SmokeError(f"{action} 业务失败: {payload}")
    return payload.get("data")


def decimal_text(value: Decimal | float | int | str) -> str:
    return str(Decimal(str(value)).quantize(Decimal("0.01")))


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeError(message)


def pick_id(items: list[dict[str, Any]], key: str = "id") -> Any:
    ensure(bool(items), "列表为空，无法选择 ID")
    return items[0][key]


def as_list(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        if isinstance(data.get("list"), list):
            return data["list"]
        if isinstance(data.get("records"), list):
            return data["records"]
    return []


def build_detail(category_id: int, amount: str, description: str, *, expense_date: str, tax_amount: str = "0.00",
                 vendor_name: str | None = None, invoice_no: str | None = None, invoice_code: str | None = None,
                 invoice_type: int | None = None, invoice_recognition_id: int | None = None) -> dict[str, Any]:
    detail = {
        "categoryId": category_id,
        "expenseDate": expense_date,
        "amount": amount,
        "taxAmount": tax_amount,
        "description": description,
        "vendorName": vendor_name or "",
        "invoiceNo": invoice_no or "",
        "invoiceCode": invoice_code or "",
        "invoiceType": invoice_type,
        "hasInvoice": 1 if invoice_no else 0,
        "invoiceRecognitionId": invoice_recognition_id,
    }
    return detail


def wait_for_pending(client: Client, reimbursement_id: int, *, expect_user: str, timeout_s: int = 30) -> dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        page = client.get("/v1/approvals/pending", {"page": 1, "pageSize": 20})
        for item in page.get("list", []):
            if int(item["reimbursementId"]) == int(reimbursement_id):
                return item
        time.sleep(1)
    raise SmokeError(f"{expect_user} 未看到待审批单 {reimbursement_id}")


def find_payment(client: Client, reimbursement_no: str, timeout_s: int = 30) -> dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        page = client.get("/v1/payments", {"page": 1, "pageSize": 20, "keyword": reimbursement_no})
        if page.get("list"):
            return page["list"][0]
        time.sleep(1)
    raise SmokeError(f"未找到付款记录: {reimbursement_no}")


def submit_manual_reimbursement(admin: Client, *, prefix: str, suffix: str, type_id: int, category_id: int,
                                department_id: int, amount: str, draft: bool, project_id: int | None = None) -> dict[str, Any]:
    payload = {
        "title": f"{prefix}-{suffix}",
        "typeId": type_id,
        "departmentId": department_id,
        "currency": "CNY",
        "remark": suffix,
        "draft": draft,
        "payeeName": admin.user_info["realName"],
        "payeeBankName": "测试银行",
        "payeeBankAccount": "6222000000000000",
        "details": [
            build_detail(
                category_id,
                amount,
                suffix,
                expense_date=time.strftime("%Y-%m-%d"),
                vendor_name="示例地区测试商户",
            )
        ],
    }
    if project_id:
        payload["projectId"] = project_id
    reimb_id = admin.post("/v1/reimbursements", payload)
    detail = admin.get(f"/v1/reimbursements/{reimb_id}")
    return {"id": reimb_id, "reimbNo": detail["reimbNo"], "title": detail["title"]}


def approve_reimbursement(client: Client, reimbursement_id: int, *, opinion: str, approved_amount: str | None = None) -> None:
    payload: dict[str, Any] = {"action": 1, "opinion": opinion}
    if approved_amount is not None:
        payload["approvedAmount"] = approved_amount
    client.post(f"/v1/approvals/{reimbursement_id}/approve", payload)


def reject_reimbursement(client: Client, reimbursement_id: int, *, opinion: str) -> None:
    client.post(f"/v1/approvals/{reimbursement_id}/approve", {"action": 2, "opinion": opinion})


def transfer_reimbursement(client: Client, reimbursement_id: int, *, target_user_id: int, reason: str) -> None:
    client.post(
        f"/v1/approvals/{reimbursement_id}/approve",
        {"action": 3, "opinion": "转审", "targetUserId": target_user_id, "transferReason": reason},
    )


def confirm_payment(client: Client, payment_id: int, payment_no: str) -> None:
    client.post(
        f"/v1/payments/{payment_id}/confirm",
        {
            "paymentMethod": 1,
            "paymentBank": "示例地区测试银行",
            "paymentAccount": "6222000000000000",
            "transactionNo": f"TX-{payment_no}",
            "voucherNo": f"V-{payment_no}",
            "remark": "API smoke 确认付款",
        },
    )


def run_mysql(sql: str) -> None:
    subprocess.run(
        [MYSQL_BIN, "-u", MYSQL_USER, f"-p{MYSQL_PASSWORD}", MYSQL_DB, "-Nse", sql],
        check=True,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def run_mysql_scalar(sql: str) -> str:
    result = subprocess.run(
        [MYSQL_BIN, "-u", MYSQL_USER, f"-p{MYSQL_PASSWORD}", MYSQL_DB, "-Nse", sql],
        check=True,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout.strip()


def insert_seed_invoice(*, user_id: int, prefix: str, slug: str, amount: str) -> dict[str, Any]:
    stamp = time.strftime("%Y%m%d%H%M%S")
    invoice_no = f"{prefix.replace('-', '')[:12]}{slug[:2].upper()}{stamp[-6:]}"
    invoice_code = f"31{stamp[-10:]}"
    date_text = time.strftime("%Y-%m-%d")
    seller_name = f"示例地区回归样例-{slug}"
    file_path = f"seed/{prefix}/{slug}.png"
    file_url = f"http://127.0.0.1:18760/api/v1/files/{file_path}"
    sql = f"""
    INSERT INTO invoice_recognition
    (user_id, original_file_name, file_path, file_url, ocr_provider, ocr_request_id, recognition_status,
     confidence, invoice_type, invoice_code, invoice_no, invoice_date, seller_name,
     total_amount, tax_amount, amount_with_tax, currency, verify_status, is_duplicate, created_by)
    VALUES
    ({user_id}, '{prefix}-{slug}.png', '{file_path}', '{file_url}', 'seed-data', 'seed-{prefix}-{slug}', 2,
     1.0000, 3, '{invoice_code}', '{invoice_no}', '{date_text}', '{seller_name}',
     {amount}, 0.00, {amount}, 'CNY', 0, 0, {user_id});
    SELECT LAST_INSERT_ID();
    """
    invoice_id = int(run_mysql_scalar(sql).splitlines()[-1])
    return {
        "id": invoice_id,
        "invoiceNo": invoice_no,
        "invoiceCode": invoice_code,
        "invoiceDate": date_text,
        "sellerName": seller_name,
        "amountWithTax": amount,
        "invoiceType": 3,
    }


def cleanup_manifest(manifest: dict[str, Any]) -> None:
    reimbursement_ids = [str(item["id"]) for item in manifest.get("reimbursements", {}).values() if item.get("id")]
    ocr_ids = [str(item["id"]) for item in manifest.get("ocrRecords", {}).values() if item.get("id")]
    reimbursement_nos = [item["reimbNo"] for item in manifest.get("reimbursements", {}).values() if item.get("reimbNo")]
    if reimbursement_ids:
        ids = ",".join(reimbursement_ids)
        run_mysql(f"UPDATE payment_record SET is_deleted = 1 WHERE reimbursement_id IN ({ids});")
        run_mysql(f"UPDATE approval_record SET is_deleted = 1 WHERE reimbursement_id IN ({ids});")
        run_mysql(f"UPDATE approval_instance SET is_deleted = 1 WHERE reimbursement_id IN ({ids});")
        run_mysql(f"UPDATE reimbursement_attachment SET is_deleted = 1 WHERE reimbursement_id IN ({ids});")
        run_mysql(f"UPDATE reimbursement_detail SET is_deleted = 1 WHERE reimbursement_id IN ({ids});")
        run_mysql(f"UPDATE reimbursement SET is_deleted = 1 WHERE id IN ({ids});")
    if ocr_ids:
        ids = ",".join(ocr_ids)
        run_mysql(f"DELETE FROM ocr_result WHERE recognition_id IN ({ids});")
        run_mysql(f"UPDATE invoice_recognition SET is_deleted = 1, reimbursement_id = NULL, detail_id = NULL WHERE id IN ({ids});")
    if reimbursement_nos:
        clauses = " OR ".join(
            [f"(title LIKE '%{no}%' OR content LIKE '%{no}%')" for no in reimbursement_nos]
        )
        run_mysql(f"UPDATE notification SET is_deleted = 1 WHERE {clauses};")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--cleanup", action="store_true")
    args = parser.parse_args()

    if args.cleanup:
        manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
        cleanup_manifest(manifest)
        manifest["cleanup"] = {"status": "done", "at": time.strftime("%Y-%m-%d %H:%M:%S")}
        write_json(args.manifest, manifest)
        print(f"[cleanup] cleaned {args.manifest}")
        return 0

    ensure(ORDINARY_SAMPLE.exists(), f"缺少样例文件: {ORDINARY_SAMPLE}")
    ensure(TRAIN_SAMPLE.exists(), f"缺少样例文件: {TRAIN_SAMPLE}")

    prefix = f"AUTO-CLOSURE-{time.strftime('%Y%m%d%H%M%S')}"
    admin = Client(ADMIN_USER, ADMIN_PASSWORD, requests.Session())
    approver = Client(APPROVER_USER, APPROVER_PASSWORD, requests.Session())
    admin.login()
    approver.login()

    result: dict[str, Any] = {
        "apiBase": API_BASE,
        "prefix": prefix,
        "startedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "admin": {"id": admin.user_info["id"], "username": ADMIN_USER},
        "approver": {"id": approver.user_info["id"], "username": APPROVER_USER},
        "smoke": {},
        "ocrRecords": {},
        "reimbursements": {},
        "payments": {},
    }

    types = admin.get("/v1/reimbursement-types")
    categories = admin.get("/v1/expense-categories")
    projects = admin.get("/v1/projects", {"page": 1, "pageSize": 20})
    companies = admin.get("/v1/companies")
    departments = admin.get("/v1/departments")
    org_tree = admin.get("/v1/organizations/tree")
    dict_types = admin.get("/v1/dict-types", {"page": 1, "pageSize": 10})
    system_configs_before = admin.get("/v1/system-configs", {"page": 1, "pageSize": 10})
    report_summary = admin.get("/v1/reports/summary")
    ocr_status = admin.get("/v1/invoices/ocr/status")
    notifications = admin.get("/v1/notifications", {"page": 1, "pageSize": 10})
    unread_count = admin.get("/v1/notifications/unread-count")
    payment_summary_before = admin.get("/v1/payments/summary")

    ensure(ocr_status["enabled"], f"OCR 未启用: {ocr_status}")
    ensure(bool(types), "报销类型为空")
    ensure(bool(categories), "费用类别为空")
    ensure(bool(as_list(companies)), "公司列表为空")
    ensure(bool(as_list(departments)), "部门列表为空")
    ensure(bool(org_tree), "组织树为空")
    ensure(report_summary is not None, "报表汇总为空")
    ensure(unread_count is not None and notifications is not None, "通知接口异常")

    preferred_type = next((item for item in types if not bool(item.get("requireProject"))), types[0])
    type_id = preferred_type["id"]
    category_id = pick_id(categories)
    department_id = int(admin.user_info["departmentId"])
    project_list = as_list(projects)
    if not project_list:
        created_project_id = admin.post(
            "/v1/projects",
            {
                "projectCode": f"{prefix}-PRJ",
                "projectName": f"{prefix}-项目",
                "projectType": "business",
                "companyId": int(admin.user_info["companyId"]),
                "departmentId": department_id,
                "leaderUserId": int(admin.user_info["id"]),
                "totalBudget": "100000.00",
                "startDate": time.strftime("%Y-%m-%d"),
                "description": "API smoke 自动补齐项目",
                "memberUserIds": [int(admin.user_info["id"])],
            },
        )
        projects = admin.get("/v1/projects", {"page": 1, "pageSize": 20})
        project_list = as_list(projects)
        result["smoke"]["seedProjectId"] = created_project_id
    project_id = project_list[0].get("id")

    ordinary = admin.upload("/v1/invoices/ocr", ORDINARY_SAMPLE)
    ordinary_verified = admin.post(f"/v1/invoices/ocr/{ordinary['id']}/verify")
    train = admin.upload("/v1/invoices/ocr", TRAIN_SAMPLE)
    api_generated = insert_seed_invoice(user_id=int(admin.user_info["id"]), prefix=prefix, slug="api", amount="81.11")
    web_generated = insert_seed_invoice(user_id=int(admin.user_info["id"]), prefix=prefix, slug="web", amount="82.22")
    mobile_generated = insert_seed_invoice(user_id=int(admin.user_info["id"]), prefix=prefix, slug="mobile", amount="83.33")
    invoice_page = admin.get("/v1/invoices", {"page": 1, "pageSize": 10, "mineOnly": True})
    ensure(any(int(item["id"]) == int(ordinary["id"]) for item in invoice_page.get("list", [])), "普通发票未进入发票夹")
    ensure(any(int(item["id"]) == int(train["id"]) for item in invoice_page.get("list", [])), "火车票未进入发票夹")
    ensure(any(int(item["id"]) == int(api_generated["id"]) for item in invoice_page.get("list", [])), "API 票据未进入发票夹")
    ensure(any(int(item["id"]) == int(web_generated["id"]) for item in invoice_page.get("list", [])), "Web 票据未进入发票夹")
    ensure(any(int(item["id"]) == int(mobile_generated["id"]) for item in invoice_page.get("list", [])), "Mobile 票据未进入发票夹")

    result["ocrRecords"]["ordinary"] = {
        "id": ordinary["id"],
        "invoiceNo": ordinary.get("invoiceNo"),
        "invoiceTypeName": ordinary.get("invoiceTypeName"),
        "verifyStatus": ordinary_verified.get("checkResult", {}).get("verifyStatus"),
    }
    result["ocrRecords"]["train"] = {
        "id": train["id"],
        "invoiceNo": train.get("invoiceNo"),
        "invoiceTypeName": train.get("invoiceTypeName"),
    }
    result["ocrRecords"]["api"] = {
        "id": api_generated["id"],
        "invoiceNo": api_generated.get("invoiceNo"),
        "invoiceCode": api_generated.get("invoiceCode"),
        "amountWithTax": api_generated.get("amountWithTax") or api_generated.get("totalAmount"),
    }
    result["ocrRecords"]["uiWeb"] = {
        "id": web_generated["id"],
        "invoiceNo": web_generated.get("invoiceNo"),
        "invoiceCode": web_generated.get("invoiceCode"),
        "amountWithTax": web_generated.get("amountWithTax") or web_generated.get("totalAmount"),
    }
    result["ocrRecords"]["uiMobile"] = {
        "id": mobile_generated["id"],
        "invoiceNo": mobile_generated.get("invoiceNo"),
        "invoiceCode": mobile_generated.get("invoiceCode"),
        "amountWithTax": mobile_generated.get("amountWithTax") or mobile_generated.get("totalAmount"),
    }

    api_amount = api_generated.get("amountWithTax") or api_generated.get("totalAmount") or "81.11"
    api_tax = api_generated.get("taxAmount") or "0.00"
    api_date = api_generated.get("invoiceDate") or time.strftime("%Y-%m-%d")
    ordinary_detail = build_detail(
        category_id,
        decimal_text(api_amount),
        "样例普通发票",
        expense_date=api_date,
        tax_amount=decimal_text(api_tax),
        vendor_name=api_generated.get("sellerName"),
        invoice_no=api_generated.get("invoiceNo"),
        invoice_code=api_generated.get("invoiceCode"),
        invoice_type=api_generated.get("invoiceType"),
        invoice_recognition_id=api_generated.get("id"),
    )

    # System config CRUD
    config_key = f"closure.{prefix.lower()}"
    config_id = admin.post(
        "/v1/system-configs",
        {
            "configGroup": "closure",
            "configKey": config_key,
            "configValue": "created",
            "valueType": "STRING",
            "configName": prefix,
            "status": 1,
            "sortOrder": 99,
            "remark": prefix,
        },
    )
    admin.put(
        f"/v1/system-configs/{config_id}",
        {
            "configGroup": "closure",
            "configKey": config_key,
            "configValue": "updated",
            "valueType": "STRING",
            "configName": prefix,
            "status": 1,
            "sortOrder": 100,
            "remark": f"{prefix}-updated",
        },
    )
    config_page = admin.get("/v1/system-configs", {"page": 1, "pageSize": 10, "keyword": config_key})
    ensure(any(int(item["id"]) == int(config_id) for item in config_page.get("list", [])), "系统配置查询未命中新建配置")
    admin.delete(f"/v1/system-configs/{config_id}")
    deleted_page = admin.get("/v1/system-configs", {"page": 1, "pageSize": 10, "keyword": config_key})
    ensure(not any(int(item["id"]) == int(config_id) for item in deleted_page.get("list", [])), "系统配置删除失败")
    result["smoke"]["systemConfig"] = {"id": config_id, "key": config_key, "deleted": True}

    # API full success chain with sample invoice + draft submit
    success_payload = {
        "title": f"{prefix}-SUCCESS",
        "typeId": type_id,
        "departmentId": department_id,
        "currency": "CNY",
        "remark": "success",
        "draft": True,
        "payeeName": admin.user_info["realName"],
        "payeeBankName": "测试银行",
        "payeeBankAccount": "6222000000000000",
        "details": [ordinary_detail],
    }
    if preferred_type.get("requireProject") and project_id:
        success_payload["projectId"] = project_id
    success_id = admin.post("/v1/reimbursements", success_payload)
    admin.post(f"/v1/reimbursements/{success_id}/submit")
    success_list = admin.get("/v1/reimbursements", {"page": 1, "pageSize": 10, "keyword": prefix})
    ensure(any(int(item["id"]) == int(success_id) for item in success_list.get("list", [])), "报销列表未包含成功链路单据")
    wait_for_pending(approver, success_id, expect_user="approver")
    approve_reimbursement(approver, success_id, opinion="API 审批通过", approved_amount=decimal_text(api_amount))
    success_detail = admin.get(f"/v1/reimbursements/{success_id}")
    approval_records = admin.get(f"/v1/approvals/records/{success_id}")
    ensure(bool(approval_records), "审批记录为空")
    ensure(
        any(int(item.get("action", 0)) == 1 for item in approval_records),
        "审批记录未包含通过动作",
    )
    success_payment = find_payment(admin, success_detail["reimbNo"])
    confirm_payment(admin, int(success_payment["id"]), success_payment["paymentNo"])
    result["reimbursements"]["success"] = {
        "id": success_id,
        "reimbNo": success_detail["reimbNo"],
        "paymentId": success_payment["id"],
        "paymentNo": success_payment["paymentNo"],
    }

    # Withdraw
    withdraw_reimb = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="WITHDRAW", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="88.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    admin.post(f"/v1/reimbursements/{withdraw_reimb['id']}/withdraw")
    withdraw_detail = admin.get(f"/v1/reimbursements/{withdraw_reimb['id']}")
    result["reimbursements"]["withdraw"] = {
        **withdraw_reimb,
        "status": withdraw_detail["status"],
    }

    # Reject and resubmit
    reject_reimb = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="REJECT", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="66.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    wait_for_pending(approver, reject_reimb["id"], expect_user="approver")
    reject_reimbursement(approver, reject_reimb["id"], opinion="资料不足")
    rejected_detail = admin.get(f"/v1/reimbursements/{reject_reimb['id']}")
    reject_update_payload = {
        "id": reject_reimb["id"],
        "title": f"{prefix}-REJECT-RESUBMIT",
        "typeId": type_id,
        "departmentId": department_id,
        "currency": "CNY",
        "remark": "resubmit",
        "draft": False,
        "payeeName": admin.user_info["realName"],
        "payeeBankName": "测试银行",
        "payeeBankAccount": "6222000000000000",
        "details": [build_detail(category_id, "67.00", "resubmit", expense_date=time.strftime("%Y-%m-%d"))],
    }
    if preferred_type.get("requireProject") and project_id:
        reject_update_payload["projectId"] = project_id
    admin.put(f"/v1/reimbursements/{reject_reimb['id']}", reject_update_payload)
    wait_for_pending(approver, reject_reimb["id"], expect_user="approver")
    approve_reimbursement(approver, reject_reimb["id"], opinion="重提通过", approved_amount="67.00")
    reject_payment = find_payment(admin, rejected_detail["reimbNo"])
    result["reimbursements"]["rejectResubmit"] = {
        "id": reject_reimb["id"],
        "reimbNo": rejected_detail["reimbNo"],
        "paymentId": reject_payment["id"],
    }

    # Transfer
    transfer_reimb = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="TRANSFER", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="68.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    wait_for_pending(approver, transfer_reimb["id"], expect_user="approver")
    transfer_reimbursement(approver, transfer_reimb["id"], target_user_id=int(admin.user_info["id"]), reason="转给管理员")
    wait_for_pending(admin, transfer_reimb["id"], expect_user="admin")
    approve_reimbursement(admin, transfer_reimb["id"], opinion="转审后通过", approved_amount="68.00")
    transfer_detail = admin.get(f"/v1/reimbursements/{transfer_reimb['id']}")
    transfer_payment = find_payment(admin, transfer_detail["reimbNo"])
    result["reimbursements"]["transfer"] = {
        "id": transfer_reimb["id"],
        "reimbNo": transfer_detail["reimbNo"],
        "paymentId": transfer_payment["id"],
    }

    # Fail flow
    fail_reimb = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="FAIL", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="69.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    wait_for_pending(approver, fail_reimb["id"], expect_user="approver")
    approve_reimbursement(approver, fail_reimb["id"], opinion="待付款", approved_amount="69.00")
    fail_payment = find_payment(admin, fail_reimb["reimbNo"])
    admin.post(f"/v1/payments/{fail_payment['id']}/fail", params={"remark": "API smoke fail"})
    result["reimbursements"]["fail"] = {
        "id": fail_reimb["id"],
        "reimbNo": fail_reimb["reimbNo"],
        "paymentId": fail_payment["id"],
        "paymentNo": fail_payment["paymentNo"],
    }

    # Refund flow
    refund_reimb = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="REFUND", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="70.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    wait_for_pending(approver, refund_reimb["id"], expect_user="approver")
    approve_reimbursement(approver, refund_reimb["id"], opinion="待退款", approved_amount="70.00")
    refund_payment = find_payment(admin, refund_reimb["reimbNo"])
    confirm_payment(admin, int(refund_payment["id"]), refund_payment["paymentNo"])
    admin.post(f"/v1/payments/{refund_payment['id']}/refund", params={"remark": "API smoke refund"})
    result["reimbursements"]["refund"] = {
        "id": refund_reimb["id"],
        "reimbNo": refund_reimb["reimbNo"],
        "paymentId": refund_payment["id"],
        "paymentNo": refund_payment["paymentNo"],
    }

    # UI pending approvals and payment left open for browser tests
    ui_web_approval = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="UI-WEB-APPROVAL", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="71.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    wait_for_pending(approver, ui_web_approval["id"], expect_user="approver")
    result["reimbursements"]["uiWebApproval"] = ui_web_approval
    result["reimbursements"]["uiWebApproval"]["invoiceRecognitionId"] = web_generated["id"]

    ui_mobile_approval = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="UI-MOBILE-APPROVAL", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="72.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    wait_for_pending(approver, ui_mobile_approval["id"], expect_user="approver")
    result["reimbursements"]["uiMobileApproval"] = ui_mobile_approval
    result["reimbursements"]["uiMobileApproval"]["invoiceRecognitionId"] = mobile_generated["id"]

    ui_web_payment = submit_manual_reimbursement(
        admin, prefix=prefix, suffix="UI-WEB-PAYMENT", type_id=type_id, category_id=category_id,
        department_id=department_id, amount="73.00", draft=False,
        project_id=project_id if preferred_type.get("requireProject") else None
    )
    wait_for_pending(approver, ui_web_payment["id"], expect_user="approver")
    approve_reimbursement(approver, ui_web_payment["id"], opinion="待 Web 付款", approved_amount="73.00")
    ui_web_payment_record = find_payment(admin, ui_web_payment["reimbNo"])
    result["reimbursements"]["uiWebPayment"] = {
        **ui_web_payment,
        "paymentId": ui_web_payment_record["id"],
        "paymentNo": ui_web_payment_record["paymentNo"],
    }

    result["smoke"].update(
        {
            "types": len(types),
            "categories": len(categories),
            "projects": len(project_list),
            "companies": len(as_list(companies)),
            "departments": len(as_list(departments)),
            "systemConfigsBefore": system_configs_before.get("total", 0),
        }
    )
    result["reportSummary"] = report_summary
    result["ocrStatus"] = ocr_status
    result["notifications"] = {
        "pageTotal": notifications.get("total", 0),
        "unreadCount": unread_count,
    }
    result["paymentSummaryBefore"] = payment_summary_before
    result["paymentSummaryAfter"] = admin.get("/v1/payments/summary")

    write_json(args.manifest, result)
    print(f"[smoke] manifest written to {args.manifest}")
    print(json.dumps(_json_safe(result["reimbursements"]), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SmokeError as exc:
        print(f"[smoke][error] {exc}", file=sys.stderr)
        raise SystemExit(1)
