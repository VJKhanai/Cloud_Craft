// upload.js
const AWS = require("aws-sdk");
const express = require("express");

const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ AWS configuration
AWS.config.update({
  accessKeyId: "",
  secretAccessKey: "",
  region: ""
});

const s3 = new AWS.S3();
const ses = new AWS.SES(); // ✅ Initialize SES
const bucketName = "cloud-craft-storage";

// ✅ Upload route with S3 + SES email
app.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const { email } = req.body;

  if (!email || !file) {
    return res.status(400).json({ error: "Missing email or file" });
  }

  const fileName = Date.now() + path.extname(file.originalname);
  const key = `${email}/${fileName}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read", // Optional: makes the file publicly accessible
  };

  try {
    const data = await s3.upload(params).promise();

    // ✅ Send confirmation email to the user
    const emailParams = {
      Source: "", // ✅ Replace with your verified SES sender email
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: "✅ File Uploaded to Cloud Craft",
        },
        Body: {
          Text: {
            Data: `Hi ${email},\n\nYour file "${file.originalname}" has been uploaded successfully.\n\nAccess it at:\n${data.Location}\n\n- Cloud Craft Team`,
          }
        }
      }
    };

    await ses.sendEmail(emailParams).promise();

    res.json({ message: "File uploaded successfully and email sent!", url: data.Location });
  } catch (err) {
    console.error("Upload or email error:", err);
    res.status(500).json({ error: "Upload failed or email could not be sent" });
  }
});

app.listen(4000, () => {
  console.log("Uploader running on http://localhost:4000");
});
