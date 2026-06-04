import fs from 'node:fs'
import path from 'node:path'

const playwrightModule =
  process.env.PLAYWRIGHT_MODULE ||
  'file://<LOCAL_PATH>'
const playwrightExecutablePath =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  '<LOCAL_PATH> Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const ROOT = process.cwd()
const WEB_BASE = 'http://127.0.0.1:18761'
const MOBILE_BASE = 'http://127.0.0.1:18762/#'
const ORDINARY_SAMPLE = path.join(ROOT, 'samples', 'dzfp_26512000002165328481_示例地区中油鸿华能源有限公司_20260525162018.pdf')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { target: 'web', manifest: '', reportDir: '' }
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--target') out.target = args[i + 1]
    if (args[i] === '--manifest') out.manifest = args[i + 1]
    if (args[i] === '--report-dir') out.reportDir = args[i + 1]
  }
  if (!out.manifest || !out.reportDir) {
    throw new Error('usage: node scripts/ui_e2e.mjs --target web|mobile --manifest <file> --report-dir <dir>')
  }
  return out
}

function saveManifest(manifestPath, manifest) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function buildApiUrl(pathname, params = {}) {
  const url = new URL(`http://127.0.0.1:18760/api${pathname}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })
  return url
}

async function apiRequest({ token, pathname, params }) {
  const response = await fetch(buildApiUrl(pathname, params), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || ![0, 200].includes(payload.code)) {
    throw new Error(`[api] GET ${pathname} failed: ${JSON.stringify(payload)}`)
  }
  return payload.data
}

async function ensureVisible(locator, timeout = 30000) {
  await locator.waitFor({ state: 'visible', timeout })
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function launchBrowser({ isMobile = false, viewport } = {}) {
  const { chromium } = await import(playwrightModule)
  const browser = await chromium.launch({
    headless: true,
    executablePath: playwrightExecutablePath,
  })
  const context = await browser.newContext({
    viewport: viewport || (isMobile ? { width: 430, height: 932 } : { width: 1440, height: 1080 }),
    isMobile,
  })
  return { browser, context }
}

async function webLogin(page, username, password) {
  await page.goto(`${WEB_BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  const inputs = page.locator('input')
  await inputs.nth(0).fill(username)
  await inputs.nth(1).fill(password)
  await page.getByRole('button', { name: /登\s*录|登录并进入|登录/ }).click()
  await page.waitForURL(/dashboard/, { timeout: 30000 })
}

async function getWebToken(page) {
  return page.evaluate(() => localStorage.getItem('token') || '')
}

async function setUniLogin(page, username, password) {
  await page.evaluate(
    ({ username: currentUsername, password: currentPassword }) => {
      const inputs = Array.from(document.querySelectorAll('input'))
      if (inputs[0]) {
        inputs[0].value = currentUsername
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }))
      }
      if (inputs[1]) {
        inputs[1].value = currentPassword
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }))
      }
    },
    { username, password },
  )
}

async function mobileLogin(page, username, password) {
  await page.goto(`${MOBILE_BASE}/pages/auth/login`, { waitUntil: 'load' })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.reload({ waitUntil: 'load' })
  await wait(1200)
  await setUniLogin(page, username, password)
  await page.locator('uni-button.primary-btn').first().click()
  await page.waitForFunction(() => location.hash.includes('/pages/home/index'), { timeout: 30000 })
}

async function selectAntOption(page, triggerLocator, optionMatcher) {
  await triggerLocator.click()
  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await ensureVisible(dropdown)
  const options = dropdown.locator('.ant-select-item-option')
  const count = await options.count()
  for (let i = 0; i < count; i += 1) {
    const option = options.nth(i)
    const text = (await option.innerText()).trim()
    if (!optionMatcher || optionMatcher(text)) {
      await option.click()
      return text
    }
  }
  throw new Error('No matching ant-select option found')
}

async function selectUniPicker(page, pickerIndex, optionMatcher) {
  await page.locator('uni-picker').nth(pickerIndex).click()
  await wait(500)
  const container = page.locator('.uni-picker-container[style*="display: block"]').last()
  await ensureVisible(container)
  const options = container.locator('.uni-picker-item')
  const count = await options.count()
  for (let i = 0; i < count; i += 1) {
    const option = options.nth(i)
    const text = (await option.innerText()).trim()
    if (!optionMatcher || optionMatcher(text, i)) {
      await option.click()
      await container.locator('.uni-picker-action-confirm').click()
      await wait(500)
      return text
    }
  }
  throw new Error(`No matching uni-picker option found for picker ${pickerIndex}`)
}

async function ensureAntTableRowChecked(rowLocator) {
  const checkboxInput = rowLocator.locator('.ant-checkbox-input').first()
  if (await checkboxInput.isChecked()) {
    return
  }

  const clickTargets = [
    rowLocator.locator('.ant-checkbox').first(),
    rowLocator.locator('.ant-table-selection-column').first(),
    rowLocator.locator('td').first(),
  ]

  for (const target of clickTargets) {
    if ((await target.count()) === 0) {
      continue
    }
    await target.click({ force: true })
    await wait(200)
    if (await checkboxInput.isChecked()) {
      return
    }
  }

  throw new Error('未能选中表格行复选框')
}

async function createWebSubmittedReimbursement(page, manifest, webToken, reportDir) {
  await page.goto(`${WEB_BASE}/reimbursement/create`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.page-title'))
  const title = `${manifest.prefix}-WEB-UI-SUBMIT`
  await page.getByPlaceholder('报销标题').fill(title)
  await selectAntOption(
    page,
    page.locator('.ant-form-item').filter({ hasText: '报销类型' }).locator('.ant-select-selector').first(),
    (text) => /日常报销|内部报销|采购报销/.test(text),
  )
  await wait(600)
  await page.getByRole('button', { name: '从发票夹导入' }).click()
  await ensureVisible(page.locator('.ant-modal'))
  await page.getByPlaceholder('发票号 / 销方').fill(manifest.ocrRecords.uiWeb.invoiceNo)
  const invoiceRow = page.locator('.ant-modal .ant-table-row').filter({ hasText: manifest.ocrRecords.uiWeb.invoiceNo }).first()
  await ensureVisible(invoiceRow)
  await ensureAntTableRowChecked(invoiceRow)
  await page.locator('.ant-modal .btn-import').click()
  await wait(800)
  const categorySelector = page.locator('.ant-table-tbody .ant-select-selector').first()
  await selectAntOption(page, categorySelector)
  await page.getByRole('button', { name: '提交审批' }).last().click()
  await wait(2500)
  let createdRecord = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pageData = await apiRequest({
      token: webToken,
      pathname: '/v1/reimbursements',
      params: { page: 1, pageSize: 10, keyword: title },
    })
    createdRecord = (pageData.list || []).find((item) => item.title === title) || pageData.list?.[0] || null
    if (createdRecord?.id && createdRecord?.reimbNo) {
      break
    }
    await wait(1000)
  }
  if (!createdRecord?.id || !createdRecord?.reimbNo) {
    await page.screenshot({ path: path.join(reportDir, 'web-submit-failure.png'), fullPage: true })
    const bodyText = (await page.locator('body').innerText()).slice(0, 2400)
    throw new Error(`未能定位 Web 新建报销单\n${bodyText}`)
  }
  await page.goto(`${WEB_BASE}/reimbursement/${createdRecord.id}`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('body').getByText(createdRecord.reimbNo).first())
  manifest.reimbursements.uiWebCreated = { id: createdRecord.id, reimbNo: createdRecord.reimbNo, title }
  return manifest.reimbursements.uiWebCreated
}

async function approveWebPending(page, reimbNo) {
  await page.goto(`${WEB_BASE}/approval/pending`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '待我审批' }).first())
  const approvalCard = page.locator('.pending-card').filter({ hasText: reimbNo }).first()
  await ensureVisible(approvalCard)
  await approvalCard.getByText('通过').click()
  await page.locator('.ant-modal-confirm .ant-btn-primary').last().click()
  await wait(1500)
}

async function confirmWebPayment(page, reimbNo, webToken) {
  await page.goto(`${WEB_BASE}/payment/list`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '付款管理' }).first())
  let paymentRecord = null
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const pageData = await apiRequest({
      token: webToken,
      pathname: '/v1/payments',
      params: { page: 1, pageSize: 20, keyword: reimbNo },
    })
    paymentRecord = (pageData.list || []).find((item) => item.reimbNo === reimbNo) || pageData.list?.[0] || null
    if (paymentRecord?.paymentNo) {
      break
    }
    await wait(1000)
  }
  if (!paymentRecord?.paymentNo) {
    throw new Error(`未能通过 API 定位待付款记录: ${reimbNo}`)
  }
  await page.getByPlaceholder('付款单 / 报销单 / 事由 / 收款人').fill(paymentRecord.paymentNo)
  await page.getByRole('button', { name: '查询' }).click()
  const paymentRow = page.locator('.ant-table-row').filter({ hasText: paymentRecord.paymentNo }).first()
  await ensureVisible(paymentRow)
  await paymentRow.getByText('确认付款').click()
  await selectAntOption(page, page.locator('.ant-modal .ant-select-selector').first(), (text) => text.includes('银行转账'))
  await page.getByPlaceholder('付款银行').fill('Web 验收银行')
  await page.getByPlaceholder('付款账号').fill('6222333344445555')
  await page.getByPlaceholder('交易流水号').fill(`WEB-${reimbNo}`)
  await page.getByPlaceholder('凭证编号').fill(`WEBV-${reimbNo}`)
  await page.getByPlaceholder('备注').fill('Web UI 验收')
  await page.locator('.ant-modal .ant-btn-primary').last().click()
  await wait(1500)
  return paymentRecord.paymentNo
}

async function failWebPayment(page, paymentNo) {
  await page.goto(`${WEB_BASE}/payment/list`, { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('付款单 / 报销单 / 事由 / 收款人').fill(paymentNo)
  await page.getByRole('button', { name: '查询' }).click()
  const row = page.locator('.ant-table-row').filter({ hasText: paymentNo }).first()
  await ensureVisible(row)
  await row.locator('.action-btn--fail').first().click()
  await page.getByPlaceholder('失败原因').fill('Web UI 验收失败')
  await page.locator('.ant-modal .ant-btn-dangerous').last().click()
  await wait(1200)
}

async function refundWebPayment(page, paymentNo) {
  await page.goto(`${WEB_BASE}/payment/list`, { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('付款单 / 报销单 / 事由 / 收款人').fill(paymentNo)
  await page.getByRole('button', { name: '查询' }).click()
  const row = page.locator('.ant-table-row').filter({ hasText: paymentNo }).first()
  await ensureVisible(row)
  await row.locator('.action-btn--refund').first().click()
  await page.getByPlaceholder('退款原因').fill('Web UI 验收退款')
  await page.locator('.ant-modal .ant-btn-dangerous').last().click()
  await wait(1200)
}

async function runWeb(manifest, manifestPath, reportDir) {
  const { browser, context } = await launchBrowser()
  const page = await context.newPage()

  console.log('[ui-e2e][web] login')
  await webLogin(page, 'admin', 'admin123')
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '我的工作台' }).first())
  await ensureVisible(page.locator('.action-card, .quick-action-card, button, a').filter({ hasText: '拍票识别' }).first())
  await page.screenshot({ path: path.join(reportDir, 'web-dashboard.png'), fullPage: true })

  console.log('[ui-e2e][web] ocr')
  await page.goto(`${WEB_BASE}/invoice/ocr`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.ocr-runtime-summary__title').filter({ hasText: '当前主识别:' }).first())
  await page.locator('input[type="file"]').setInputFiles(ORDINARY_SAMPLE)
  await page.getByRole('button', { name: /开始 AI 识别/ }).click()
  await ensureVisible(page.locator('body').getByText(manifest.ocrRecords.ordinary.invoiceNo).first(), 60000)
  await page.screenshot({ path: path.join(reportDir, 'web-ocr.png'), fullPage: true })

  console.log('[ui-e2e][web] invoice-list')
  await page.goto(`${WEB_BASE}/invoice/list`, { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder('发票号码/代码/销方名称').fill(manifest.ocrRecords.uiWeb.invoiceNo)
  await page.getByRole('button', { name: '查询' }).click()
  await ensureVisible(page.locator('.ant-table').getByText(manifest.ocrRecords.uiWeb.invoiceNo).first())
  await page.screenshot({ path: path.join(reportDir, 'web-invoice-list.png'), fullPage: true })

  const webToken = await getWebToken(page)
  console.log('[ui-e2e][web] create-submitted')
  const created = await createWebSubmittedReimbursement(page, manifest, webToken, reportDir)
  saveManifest(manifestPath, manifest)
  await page.screenshot({ path: path.join(reportDir, 'web-reimbursement-detail.png'), fullPage: true })

  console.log('[ui-e2e][web] approver-login')
  const approverContext = await browser.newContext({ viewport: { width: 1440, height: 1080 } })
  const approverPage = await approverContext.newPage()
  await webLogin(approverPage, 'approver', 'admin123')
  console.log('[ui-e2e][web] approve-pending')
  await approveWebPending(approverPage, created.reimbNo)
  await approverPage.screenshot({ path: path.join(reportDir, 'web-approval.png'), fullPage: true })
  await approverContext.close()

  console.log('[ui-e2e][web] confirm-payment')
  const paymentNo = await confirmWebPayment(page, created.reimbNo, webToken)
  manifest.reimbursements.uiWebCreated.paymentNo = paymentNo
  saveManifest(manifestPath, manifest)
  await page.screenshot({ path: path.join(reportDir, 'web-payment-confirm.png'), fullPage: true })

  if (manifest.reimbursements.uiWebPayment?.paymentNo) {
    console.log('[ui-e2e][web] fail-payment')
    await failWebPayment(page, manifest.reimbursements.uiWebPayment.paymentNo)
  }
  if (manifest.reimbursements.success?.paymentNo) {
    console.log('[ui-e2e][web] refund-payment')
    await refundWebPayment(page, manifest.reimbursements.success.paymentNo)
  }
  await page.screenshot({ path: path.join(reportDir, 'web-payment-fail-refund.png'), fullPage: true })

  console.log('[ui-e2e][web] governance-pages')
  await page.goto(`${WEB_BASE}/system/config`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '系统配置' }).first())
  await page.goto(`${WEB_BASE}/approval/flow`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '审批流程' }).first())
  await page.goto(`${WEB_BASE}/organization`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '组织架构' }).first())
  await page.goto(`${WEB_BASE}/project/list`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '项目管理' }).first())
  await page.goto(`${WEB_BASE}/report/dashboard`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '报表' }).first())
  await page.goto(`${WEB_BASE}/system/logs`, { waitUntil: 'domcontentloaded' })
  await ensureVisible(page.locator('.portal-header__title, .page-title').filter({ hasText: '操作日志' }).first())

  console.log('[ui-e2e][web] hidden-guide')
  await page.locator('.user-avatar, .topbar-user').first().click().catch(async () => {
    await page.getByText('admin').first().click()
  })
  await ensureVisible(page.locator('.ant-dropdown, .ant-dropdown-menu').getByText('操作说明').first())
  await page.locator('.ant-dropdown, .ant-dropdown-menu').getByText('操作说明').first().click()
  await page.waitForURL(/help\/guide/, { timeout: 30000 })
  await page.screenshot({ path: path.join(reportDir, 'web-guide.png'), fullPage: true })

  await context.close()
  await browser.close()
}

async function createMobileFromInvoiceList(page, manifest) {
  const title = `${manifest.prefix}-MOBILE-UI-SUBMIT`
  await page.goto(`${MOBILE_BASE}/pages/invoice/list`, { waitUntil: 'load' })
  await wait(2000)
  await ensureVisible(page.locator('body').getByText(manifest.ocrRecords.uiMobile.invoiceNo).first())
  await page.locator('body').getByText(manifest.ocrRecords.uiMobile.invoiceNo).first().click()
  await page.waitForFunction(() => location.hash.includes('/pages/reimbursement/create'), { timeout: 30000 })
  await wait(1500)
  await ensureVisible(page.locator('body').getByText('已选发票').first())
  await page.waitForFunction(() => {
    try {
      const raw = localStorage.getItem('userInfo')
      return !!raw && !!JSON.parse(raw).departmentId
    } catch {
      return false
    }
  }, { timeout: 15000 })
  await page.evaluate((title) => {
    const input = document.querySelector('input.uni-input-input')
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('移动端标题输入框不存在')
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, title)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    input.dispatchEvent(new Event('blur', { bubbles: true }))
  }, title)
  await wait(300)
  await selectUniPicker(page, 0, (text) => text.includes('日常报销') || text.includes('内部报销') || text.includes('采购报销'))
  await wait(1200)
  await selectUniPicker(page, 1)
  await wait(800)
  const submitButton = page.locator('uni-button.primary-btn').last()
  await submitButton.click()
  await page.waitForFunction(() => location.hash.includes('/pages/reimbursement/detail'), { timeout: 30000 })
  await wait(1500)
  const detailText = await page.locator('body').innerText()
  let reimbursementId = Number(page.url().match(/id=(\d+)/)?.[1])
  let reimbNo = detailText.match(/BX\d{12}/)?.[0]
  if (!reimbursementId || !reimbNo) {
    const mobileToken = await page.evaluate(() => localStorage.getItem('token') || '')
    const pageData = await apiRequest({
      token: mobileToken,
      pathname: '/v1/reimbursements',
      params: { page: 1, pageSize: 10, keyword: title },
    })
    const createdRecord = (pageData.list || []).find((item) => item.title === title) || pageData.list?.[0] || null
    reimbursementId = Number(createdRecord?.id || reimbursementId)
    reimbNo = createdRecord?.reimbNo || reimbNo
  }
  if (!reimbursementId || !reimbNo) {
    throw new Error('未能从移动端详情页提取新建报销单信息')
  }
  manifest.reimbursements.uiMobileCreated = { id: reimbursementId, reimbNo, title }
  return manifest.reimbursements.uiMobileCreated
}

async function runMobile(manifest, manifestPath, reportDir) {
  const { browser, context } = await launchBrowser({ isMobile: true })
  const page = await context.newPage()

  console.log('[ui-e2e][mobile] login')
  await mobileLogin(page, 'admin', 'admin123')
  await ensureVisible(page.locator('body').getByText('拍票识别').first())
  await page.screenshot({ path: path.join(reportDir, 'mobile-home.png'), fullPage: true })

  console.log('[ui-e2e][mobile] ocr-page')
  await page.goto(`${MOBILE_BASE}/pages/invoice/ocr`, { waitUntil: 'load' })
  await wait(1500)
  await ensureVisible(page.locator('body').getByText('主识别').first())
  await page.screenshot({ path: path.join(reportDir, 'mobile-ocr.png'), fullPage: true })

  console.log('[ui-e2e][mobile] confirm-create')
  const mobileConfirmSeed = {
    id: manifest.ocrRecords.uiMobile.id,
    invoiceNo: manifest.ocrRecords.uiMobile.invoiceNo,
    invoiceCode: manifest.ocrRecords.uiMobile.invoiceCode,
    amountWithTax: manifest.ocrRecords.uiMobile.amountWithTax,
    taxAmount: 0,
    invoiceDate: new Date().toISOString().slice(0, 10),
    verifyStatus: 0,
    originalFileName: 'mobile-ui-seed.pdf',
    sellerName: '移动端识别样例',
  }
  await page.evaluate((seed) => {
    localStorage.setItem('mobileLatestOcr', JSON.stringify(seed))
    localStorage.setItem('mobileSelectedInvoices', JSON.stringify([seed]))
  }, mobileConfirmSeed)
  await page.goto(`${MOBILE_BASE}/pages/invoice/confirm?id=${manifest.ocrRecords.uiMobile.id}`, { waitUntil: 'load' })
  await wait(1200)
  await ensureVisible(page.locator('body').getByText(manifest.ocrRecords.uiMobile.invoiceNo).first())
  await page.locator('uni-button.primary-btn').last().click()
  await page.waitForFunction(() => location.hash.includes('/pages/reimbursement/create'), { timeout: 30000 })
  await page.screenshot({ path: path.join(reportDir, 'mobile-confirm-create.png'), fullPage: true })

  console.log('[ui-e2e][mobile] create-from-invoice-list')
  const created = await createMobileFromInvoiceList(page, manifest)
  saveManifest(manifestPath, manifest)
  await page.screenshot({ path: path.join(reportDir, 'mobile-reimbursement-detail.png'), fullPage: true })

  await page.goto(`${MOBILE_BASE}/pages/reimbursement/list`, { waitUntil: 'load' })
  await wait(1500)
  await ensureVisible(page.locator('body').getByText(created.reimbNo).first())
  await page.screenshot({ path: path.join(reportDir, 'mobile-reimbursement-list.png'), fullPage: true })

  await context.close()
  await browser.close()

  console.log('[ui-e2e][mobile] approver-login')
  const approverBrowser = await launchBrowser({ isMobile: true })
  const approverPage = await approverBrowser.context.newPage()
  await mobileLogin(approverPage, 'approver', 'admin123')
  console.log('[ui-e2e][mobile] approve-pending')
  await approverPage.goto(`${MOBILE_BASE}/pages/approval/pending`, { waitUntil: 'load' })
  await wait(1500)
  const pendingCard = approverPage.locator('.task-card').filter({ hasText: created.title || created.reimbNo }).first()
  await ensureVisible(pendingCard)
  await pendingCard.click()
  await approverPage.waitForFunction(() => location.hash.includes('/pages/approval/detail'), { timeout: 30000 })
  await wait(1200)
  await ensureVisible(approverPage.locator('body').getByText('审批意见').first())
  await approverPage.locator('uni-button.primary-btn').last().click()
  await wait(1500)
  await approverPage.screenshot({ path: path.join(reportDir, 'mobile-approval.png'), fullPage: true })

  console.log('[ui-e2e][mobile] profile')
  await approverPage.goto(`${MOBILE_BASE}/pages/profile/index`, { waitUntil: 'load' })
  await wait(1200)
  await ensureVisible(approverPage.locator('body').getByText('我的').first())
  await approverPage.screenshot({ path: path.join(reportDir, 'mobile-profile.png'), fullPage: true })

  await approverBrowser.context.close()
  await approverBrowser.browser.close()
}

async function main() {
  const args = parseArgs()
  const manifest = JSON.parse(fs.readFileSync(args.manifest, 'utf8'))
  fs.mkdirSync(args.reportDir, { recursive: true })
  if (args.target === 'web') {
    await runWeb(manifest, args.manifest, args.reportDir)
    return
  }
  if (args.target === 'mobile') {
    await runMobile(manifest, args.manifest, args.reportDir)
    return
  }
  throw new Error(`unsupported target: ${args.target}`)
}

main().catch((error) => {
  console.error('[ui-e2e][error]', error)
  process.exit(1)
})
