const messagesEl = document.getElementById("messages")
const inputEl = document.getElementById("messageInput")
const formEl = document.getElementById("inputForm")
const sendBtn = document.getElementById("sendButton")
const micBtn = document.getElementById("micButton")
const attachBtn = document.getElementById("attachButton")
const fileInput = document.getElementById("fileInput")

function appendMessage(text, author) {
  const item = document.createElement("div")
  item.className = "message " + (author === "user" ? "user" : "bot")
  const bubble = document.createElement("div")
  bubble.className = "bubble"
  bubble.textContent = text
  item.appendChild(bubble)
  messagesEl.appendChild(item)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function appendMessageNode(node, author) {
  const item = document.createElement("div")
  item.className = "message " + (author === "user" ? "user" : "bot")
  const bubble = document.createElement("div")
  bubble.className = "bubble"
  bubble.appendChild(node)
  item.appendChild(bubble)
  messagesEl.appendChild(item)
  messagesEl.scrollTop = messagesEl.scrollHeight
}

function reply(text) {
  const t = text.trim().toLowerCase()
  if (!t) return "Please type something."
  if (["hi", "hello", "hey"].includes(t)) return "Hello! How can I help?"
  if (t.includes("time")) return new Date().toLocaleTimeString()
  if (t.includes("date")) return new Date().toLocaleDateString()
  return "You said: " + text
}

async function externalReply(text) {
  const t = text.trim().toLowerCase()
  if (t.startsWith("/quote") || t.includes("quote")) {
    const r = await fetch("https://api.quotable.io/random")
    const j = await r.json()
    if (j && j.content && j.author) return j.content + " — " + j.author
    return "No quote available."
  }
  return null
}

function greet() {
  appendMessage("Hi! Ask me anything.", "bot")
}

formEl.addEventListener("submit", async function (e) {
  e.preventDefault()
  const text = inputEl.value.trim()
  if (!text) return
  appendMessage(text, "user")
  inputEl.value = ""
  sendBtn.disabled = true
  try {
    const ext = await externalReply(text)
    if (ext) {
      appendMessage(ext, "bot")
    } else {
      const r = reply(text)
      appendMessage(r, "bot")
    }
  } catch (err) {
    appendMessage("API request failed.", "bot")
  }
  sendBtn.disabled = false
  inputEl.focus()
})

greet()

let recognition = null
let listening = false

async function ensureMicPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(function (t) { t.stop() })
    return true
  } catch (e) {
    throw e
  }
}

micBtn.addEventListener("click", async function () {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) {
    appendMessage("Speech recognition not supported.", "bot")
    return
  }
  try {
    await ensureMicPermission()
  } catch (e) {
    appendMessage("Mic permission denied. Please allow microphone access.", "bot")
    return
  }
  if (!recognition) {
    recognition = new SR()
    recognition.lang = navigator.language || "en-US"
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.continuous = false
    recognition.onresult = function (e) {
      let transcript = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript
      }
      inputEl.value = transcript
      inputEl.focus()
    }
    recognition.onerror = function (e) {
      if (e && e.error === "not-allowed") {
        appendMessage("Mic permission denied. Enable microphone for the extension.", "bot")
      } else {
        appendMessage("Mic error: " + e.error, "bot")
      }
    }
    recognition.onend = function () {
      listening = false
    }
    recognition.onstart = function () {
      listening = true
    }
  }
  if (listening) {
    recognition.stop()
    return
  }
  recognition.start()
})

attachBtn.addEventListener("click", function () {
  if (!fileInput) return
  fileInput.value = ""
  fileInput.click()
})

fileInput.addEventListener("change", function (e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  const kb = Math.max(1, Math.round(f.size / 1024))
  if (f.type && f.type.startsWith("image/")) {
    const url = URL.createObjectURL(f)
    const container = document.createElement("div")
    const img = document.createElement("img")
    img.src = url
    img.style.maxWidth = "180px"
    img.style.borderRadius = "8px"
    img.style.display = "block"
    img.style.marginBottom = "6px"
    const caption = document.createElement("div")
    caption.textContent = f.name + " (" + kb + " KB)"
    container.appendChild(img)
    container.appendChild(caption)
    appendMessageNode(container, "user")
    img.onload = function () { URL.revokeObjectURL(url) }
  } else {
    const url = URL.createObjectURL(f)
    const link = document.createElement("a")
    link.href = url
    link.download = f.name
    link.textContent = "📄 " + f.name + " (" + kb + " KB)"
    link.target = "_blank"
    appendMessageNode(link, "user")
  }
})