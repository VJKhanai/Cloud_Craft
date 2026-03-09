const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const AWS = require("aws-sdk");
require("dotenv").config();
require('dotenv').config(); // Load .env file
const BUCKET_NAME = process.env.BUCKET_NAME;


const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max allowed size is 2 MB.' });
  }
  next(err);
});

// AWS config
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const ses = new AWS.SES();
const bucketName = "cloud-craft-storage";

const clientId = "";
const clientSecret = "";
const tokenEndpoint = "";


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Exchange Cognito Code for Token
app.post("/exchange", async (req, res) => {
  const { code } = req.body;
  const referer = req.headers.referer || "";

  const redirectUri = referer.includes("code-editor-dashboard.html")
    ? "http://localhost:3000/code-editor-dashboard.html"
    : "http://localhost:3000/dashboard.html";

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("code", code);
    params.append("redirect_uri", redirectUri);

    const tokenRes = await axios.post(tokenEndpoint, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    res.json(tokenRes.data);
  } catch (err) {
    console.error("Token exchange error:", err.response?.data || err.message);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

const multer = require('multer');
const upload = multer({
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB limit
});

// ✅ Upload route with S3 + SES email
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const email = req.body.email;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded or file too large' });
    }

    // ✅ S3 upload
    const key = `${email}/${Date.now()}_${file.originalname}`;
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise();

    // ✅ SES email notification
    const emailParams = {
      Source: "vijaykhanai3333@gmail.com", // Your verified SES email
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: "✅ File Uploaded to Cloud Craft",
        },
        Body: {
          Text: {
            Data: `Hi ${email},\n\nYour file "${file.originalname}" has been uploaded successfully.\n\nYou can access it here:\n${data.Location}\n\n– Cloud Craft Team`,
          }
        }
      }
    };

    await ses.sendEmail(emailParams).promise();

    // ✅ Final response
    res.json({ message: "✅ File uploaded and email sent!", url: data.Location });

  } catch (err) {
    console.error("Upload or email error:", err);
    res.status(500).json({ error: "❌ Upload failed or email could not be sent" });
  }
});


// ✅ List Files
app.get("/list", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: "Missing email" });

  const params = {
    Bucket: bucketName,
    Prefix: `${email}/`,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    const files = data.Contents.map(obj => ({
      key: obj.Key,
      url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${obj.Key}`
    }));
    res.json({ files });
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ error: "Could not list files" });
  }
});
app.post("/rename", async (req, res) => { 
  const { email, oldKey, newName } = req.body;

  // Validate required inputs
  if (!email || !oldKey || !newName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Extract folder prefix and construct new key
  const prefix = `${email}/`;
  const newKey = prefix + newName;

  // Define parameters
  const copyParams = {
    Bucket: BUCKET_NAME,
    CopySource: `${BUCKET_NAME}/${oldKey}`,
    Key: newKey,
  };

  const deleteParams = {
    Bucket: BUCKET_NAME,
    Key: oldKey,
  };

  try {
    // Step 1: Copy the file to new key
    await s3.copyObject(copyParams).promise();

    // Step 2: Delete the original file
    await s3.deleteObject(deleteParams).promise();

    return res.json({ message: "File renamed successfully." });
  } catch (err) {
    console.error("Rename failed:", err);
    return res.status(500).json({ error: "Rename failed" });
  }
});



// ✅ Delete File
app.delete("/delete", async (req, res) => {
  const { key, email } = req.query;
  if (!key || !email) return res.status(400).json({ error: "Missing file key or email" });

  try {
    await s3.deleteObject({ Bucket: bucketName, Key: key }).promise();

    // ✅ Send email notification
    const fileName = key.split("/").pop();
    const emailParams = {
      Source: process.env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: "🗑️ File Deleted from Cloud Craft" },
        Body: {
          Html: {
            Data: `
              <p>Hi ${email},</p>
              <p>Your file <strong>${fileName}</strong> has been deleted from Cloud Craft.</p>
              <p>Thanks for using our service!</p>
              <p>– Cloud Craft Team</p>
            `
          }
        }
      }
    };

    await ses.sendEmail(emailParams).promise(); // 🔁 Send the email
    res.json({ success: true });
  } catch (err) {
    console.error("Delete or email error:", err);
    res.status(500).json({ error: "Failed to delete file or send email" });
  }
});


// ✅ Save Shared Code
app.post("/save-code", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  const key = `shared/code.txt`;

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: code,
    ContentType: "text/plain"
  };

  try {
    await s3.putObject(params).promise();
    res.json({ message: "Code saved successfully" });
  } catch (err) {
    console.error("Save code error:", err);
    res.status(500).json({ error: "Failed to save code" });
  }
});

// ✅ Load Shared Code
app.get("/load-code", async (req, res) => {
  const key = `shared/code.txt`;

  const params = {
    Bucket: bucketName,
    Key: key
  };

  try {
    const data = await s3.getObject(params).promise();
    res.send(data.Body.toString());
  } catch (err) {
    if (err.code === "NoSuchKey") return res.send("// No code found.");
    console.error("Load code error:", err);
    res.status(500).json({ error: "Failed to load code" });
  }
});

// ✅ Socket.IO Server (Collaborative code updates)
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

let currentCode = "";

// When a user connects
io.on("connection", socket => {
  console.log("🟢 A user connected");
  socket.emit("init", currentCode); // send current code to new user

  // On code change, update memory and others
  socket.on("code-change", async (newCode) => {
    currentCode = newCode;
    socket.broadcast.emit("code-change", newCode);

    // Also save to S3
    try {
      await s3.putObject({
        Bucket: bucketName,
        Key: "shared/code.txt",
        Body: newCode,
        ContentType: "text/plain"
      }).promise();
    } catch (err) {
      console.error("Auto-save to S3 failed:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 A user disconnected");
  });
});

// Start server
http.listen(3000, () => {
  console.log("✅ Server with Socket.IO running at http://localhost:3000");
});
