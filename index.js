const { Client, LocalAuth } = require("whatsapp-web.js")
const express = require("express")
const qrcode = require("qrcode-terminal")
const { default: axios } = require("axios")
const bodyParser = require("body-parser")

// Set up express
const app = express()
app.use(bodyParser.json())

// Health-check route
app.get("/", (_, res) => {
  res.send("WhatsApp API is running!")
})

// Forward messages to the user
app.post("/send-message", async (req, res) => {
  const chatId = req.body.chatId
  const message = req.body.message
  const result = await client.sendMessage(chatId, message)
  res.status(200).json(result)
})

// Start typing indicator
app.post("/start-typing", async (req, res) => {
  const chatId = req.body.chatId
  const chat = await client.getChatById(chatId)
  await chat.sendStateTyping()
  res.status(200).json({ success: true })
})

// Stop typing indicator
app.post("/stop-typing", async (req, res) => {
  const chatId = req.body.chatId
  const chat = await client.getChatById(chatId)
  await chat.clearState()
  res.status(200).json({ success: true })
})

const startServer = () => {
  // Start the server
  const port = 3000
  app.listen(port, () => {
    console.log(`✔ Server is running on port ${port}`)
  })
}

// Initialize the WhatsApp web client
const client = new Client({
  puppeteer: {
    // Run chromium in headless mode
    headless: true,
    args: ["--no-sandbox"],
  },
  // Save session to disk so you don't need to authenticate each time you start the server.
  authStrategy: new LocalAuth(),
})

// Print QR code in terminal
client.on("qr", (qr) => {
  console.log("👇 Scan QR code below to authenticate")
  qrcode.generate(qr, { small: true })
})

// Listen for client authentication
client.on("authenticated", () => {
  console.log("✔ Client is authenticated!")
})

// Listen for when client is ready to start receiving/sending messages
client.on("ready", () => {
  console.log("✔ Client is ready!")
  startServer()
})

// Forward messages to the Hono API
const apiUrl = "http://localhost:8787" // Default Hono API URL
client.on("message", (message) => {
  console.log("💬 New message received:", JSON.stringify(message.body))
  axios
    .post(`${apiUrl}/wa-message-received`, {
      message,
    })
    .catch((error) => {
      console.log(error)
    })
})

// Start WhatsApp client
console.log("◌ Starting WhatsApp client...")
client.initialize()
