<template>
  <div class="ai-copilot-container">
    <!-- ── Floating Badge ── -->
    <div
      v-if="!isOpen"
      class="ai-copilot-badge animate-pulse-glow"
      @click="toggleChat"
    >
      <div class="badge-orb"></div>
      <div class="badge-ring"></div>
      <RobotOutlined class="badge-icon" />
      <span class="badge-pulse-dot"></span>
      <div class="badge-tooltip">报销 AI 助手</div>
    </div>

    <!-- ── Glassmorphic Chat Panel ── -->
    <transition name="slide-up-fade">
      <div v-if="isOpen" class="ai-copilot-chat-panel">
        <!-- Panel Header -->
        <div class="panel-header">
          <div class="header-title">
            <RobotOutlined class="header-icon animate-bounce-slow" />
            <div class="title-text">
              <span class="main-title">示例地区 AI 报销助手</span>
              <span class="sub-title">project Policy Copilot</span>
            </div>
          </div>
          <div class="header-actions">
            <button class="panel-btn" title="清空对话" @click="clearHistory">
              <DeleteOutlined />
            </button>
            <button class="panel-btn close-btn" title="最小化" @click="toggleChat">
              <MinusOutlined />
            </button>
          </div>
        </div>

        <!-- Chat History -->
        <div class="panel-body" ref="messageContainer">
          <!-- Welcome message if empty -->
          <div v-if="messages.length === 0" class="welcome-box">
            <div class="welcome-icon-wrap">
              <RobotOutlined class="welcome-icon" />
            </div>
            <h3 class="welcome-title">您好！我是示例地区 AI 报销助手</h3>
            <p class="welcome-desc">
              您可以向我咨询出差补助标准、合规要求、预算控制机制等企业报销政策。
            </p>
            <div class="quick-chips">
              <div
                v-for="chip in quickChips"
                :key="chip"
                class="quick-chip"
                @click="sendQuickChip(chip)"
              >
                {{ chip }}
              </div>
            </div>
          </div>

          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            :class="['msg-row', msg.role === 'user' ? 'msg-row--user' : 'msg-row--assistant']"
          >
            <div class="msg-avatar">
              <UserOutlined v-if="msg.role === 'user'" />
              <RobotOutlined v-else />
            </div>
            <div class="msg-bubble-wrap">
              <div class="msg-bubble">
                <span class="msg-text" v-html="formatMessage(msg.content)"></span>
              </div>
              <div class="msg-time">{{ msg.time }}</div>
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="msg-row msg-row--assistant msg-row--loading">
            <div class="msg-avatar">
              <RobotOutlined class="animate-spin-slow" />
            </div>
            <div class="msg-bubble-wrap">
              <div class="msg-bubble loading-bubble">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel Footer -->
        <div class="panel-footer">
          <div class="footer-chips" v-if="messages.length > 0">
            <span
              v-for="chip in quickChips.slice(0, 2)"
              :key="chip"
              class="footer-chip"
              @click="sendQuickChip(chip)"
            >
              {{ chip }}
            </span>
          </div>
          <div class="input-area">
            <a-textarea
              v-model:value="inputValue"
              placeholder="请输入您的问题... (Ctrl+Enter 发送)"
              :auto-size="{ minRows: 1, maxRows: 3 }"
              class="chat-input"
              @keypress.enter.prevent="handleEnter"
            />
            <button
              class="send-btn"
              :disabled="loading || !inputValue.trim()"
              @click="sendMessage"
            >
              <SendOutlined />
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import {
  RobotOutlined,
  UserOutlined,
  DeleteOutlined,
  MinusOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import request from '@/utils/request'
import dayjs from 'dayjs'

interface Message {
  role: 'user' | 'assistant'
  content: string
  time: string
}

const isOpen = ref(false)
const inputValue = ref('')
const loading = ref(false)
const messages = ref<Message[]>([])
const messageContainer = ref<HTMLDivElement | null>(null)

const quickChips = [
  '示例地区出差住宿费标准',
  '怎么控制预算/分摊',
  '报销流程是怎样的',
]

// Retrieve history on mount
onMounted(() => {
  const stored = localStorage.getItem('ai_chat_history')
  if (stored) {
    try {
      messages.value = JSON.parse(stored)
    } catch {}
  }
})

// Save history when messages change
watch(messages, (newVal) => {
  localStorage.setItem('ai_chat_history', JSON.stringify(newVal))
  scrollToBottom()
}, { deep: true })

function toggleChat() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    scrollToBottom()
  }
}

function clearHistory() {
  messages.value = []
  localStorage.removeItem('ai_chat_history')
}

function handleEnter(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    inputValue.value += '\n'
  } else {
    sendMessage()
  }
}

function sendQuickChip(chip: string) {
  inputValue.value = chip
  sendMessage()
}

async function sendMessage() {
  const content = inputValue.value.trim()
  if (!content || loading.value) return

  inputValue.value = ''
  
  // Append user message
  messages.value.push({
    role: 'user',
    content,
    time: dayjs().format('HH:mm'),
  })

  loading.value = true
  scrollToBottom()

  try {
    const res = await request.post<{ reply: string }>('/v1/ai/copilot/chat', { message: content })
    const replyText = res?.reply || '抱歉，系统暂时无法处理您的问题，请稍后再试。'
    
    // Simulate smooth typing typewriter animation
    simulateTypewriter(replyText)
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: '服务器暂时开小差了，请检查网络或配置后再试。',
      time: dayjs().format('HH:mm'),
    })
    loading.value = false
  }
}

function simulateTypewriter(fullText: string) {
  let index = 0
  const speed = 25 // 25ms per char
  const timeStr = dayjs().format('HH:mm')
  
  messages.value.push({
    role: 'assistant',
    content: '',
    time: timeStr,
  })
  
  const msgIndex = messages.value.length - 1

  const timer = setInterval(() => {
    if (index < fullText.length) {
      messages.value[msgIndex].content += fullText.charAt(index)
      index++
      scrollToBottom()
    } else {
      clearInterval(timer)
      loading.value = false
    }
  }, speed)
}

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

function formatMessage(content: string): string {
  if (!content) return ''
  // Basic markdown formatting replacement for bold, code blocks, lists, and line breaks
  return content
    .replace(/\n/g, '<br/>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="chat-code">$1</code>')
    .replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)/g, '<ul class="chat-list">$1</ul>')
}
</script>

<style scoped lang="less">
.ai-copilot-container {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

// ── Floating Badge ──
.ai-copilot-badge {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(123, 97, 255, 0.4), 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 14px 30px rgba(123, 97, 255, 0.5), 0 6px 14px rgba(0, 0, 0, 0.15);
    
    .badge-tooltip {
      opacity: 1;
      transform: translateY(-8px);
    }
  }
}

.badge-orb {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
}

.badge-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(139, 92, 246, 0.4);
  animation: pulse-ring 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
}

.badge-icon {
  font-size: 24px;
  color: #ffffff;
  position: relative;
  z-index: 1;
}

.badge-pulse-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  background: #10b981;
  border: 2px solid #ffffff;
  border-radius: 50%;
  z-index: 2;
}

.badge-tooltip {
  position: absolute;
  bottom: 100%;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 8px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translateY(0);
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

// ── Glassmorphic Chat Panel ──
.ai-copilot-chat-panel {
  width: 380px;
  height: 520px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 5px 15px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: float-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

// Panel Header
.panel-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  font-size: 22px;
  color: #3b82f6;
}

.title-text {
  display: flex;
  flex-direction: column;
}

.main-title {
  font-size: 14.5px;
  font-weight: 700;
  color: #1e293b;
}

.sub-title {
  font-size: 10px;
  color: #64748b;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.6);
    color: #1e293b;
  }
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

// Chat Body
.panel-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
}

// Welcome box styling
.welcome-box {
  text-align: center;
  padding: 10px 0;
  margin: auto 0;
}

.welcome-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.welcome-icon {
  font-size: 26px;
  color: #3b82f6;
}

.welcome-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
}

.welcome-desc {
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 20px;
}

.quick-chips {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-chip {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 10px;
  font-size: 12px;
  color: #475569;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  text-align: left;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  
  &:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
    border-color: rgba(99, 102, 241, 0.3);
    color: #4f46e5;
    transform: translateY(-1px);
  }
}

// Conversation Bubbles
.msg-row {
  display: flex;
  gap: 12px;
  max-width: 85%;
  animation: fade-in-up 0.3s ease;
}

.msg-row--assistant {
  align-self: flex-start;
}

.msg-row--user {
  align-self: flex-end;
  flex-direction: row-reverse;
  
  .msg-bubble {
    background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
    color: #ffffff;
    border-radius: 16px 4px 16px 16px;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }
  
  .msg-avatar {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.msg-bubble-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.msg-bubble {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #334155;
  border-radius: 4px 16px 16px 16px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-all;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.msg-time {
  font-size: 10px;
  color: #94a3b8;
  align-self: flex-start;
}

.msg-row--user .msg-time {
  align-self: flex-end;
}

// Typing loader bubble
.loading-bubble {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 12px 16px;
}

.loading-dot {
  width: 6px;
  height: 6px;
  background-color: #8b5cf6;
  border-radius: 50%;
  display: inline-block;
  animation: loader-bounce 1.4s infinite ease-in-out both;
  
  &:nth-child(1) { animation-delay: -0.32s; }
  &:nth-child(2) { animation-delay: -0.16s; }
}

// Panel Footer
.panel-footer {
  padding: 14px 20px 20px;
  background: rgba(255, 255, 255, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.footer-chip {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(99, 102, 241, 0.1);
    color: #4f46e5;
    border-color: rgba(99, 102, 241, 0.2);
  }
}

.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-input {
  flex: 1;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.8) !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.02) !important;
  font-size: 12.5px;
  padding: 6px 12px;
  
  &:focus {
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
  }
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 8px rgba(79, 110, 247, 0.2);
  flex-shrink: 0;
  margin-bottom: 2px;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(79, 110, 247, 0.3);
  }
  
  &:disabled {
    background: #cbd5e1;
    color: #94a3b8;
    box-shadow: none;
    cursor: not-allowed;
  }
}

// ── Animations ──
@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 0.4; }
  100% { transform: scale(1.2); opacity: 0; }
}

@keyframes loader-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
}

@keyframes float-in {
  0% { transform: translateY(30px) scale(0.95); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-bounce-slow {
  animation: bounce-slow 2s infinite ease-in-out;
}

// Vue Transition Classes
.slide-up-fade-enter-active,
.slide-up-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-fade-enter-from,
.slide-up-fade-leave-to {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}
</style>

<style lang="less">
// Global (non-scoped) markdown helper classes for chatbot responses
.chat-code {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 11.5px;
  color: #be185d;
}

.chat-list {
  margin: 6px 0;
  padding-left: 20px;
  
  li {
    font-size: 12.5px;
    line-height: 1.6;
    color: #334155;
    margin-bottom: 2px;
  }
}
</style>
