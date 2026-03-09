# Cloud_Craft
Cloud Craft is a cloud-based personal storage and collaborative code editor built using Node.js and AWS services such as Cognito, S3, and SES. It provides secure authentication, file management, and real-time code collaboration through a web dashboard.nodejs aws aws-cognito amazon-s3 amazon-ses socketio monaco-editor cloud-storage code-editor web

# ☁️ Cloud Craft

Cloud Craft is a cloud-based personal storage and collaborative code editor built using Node.js and AWS services. The platform allows users to securely authenticate, upload and manage files, and collaborate on code in real-time through an integrated web dashboard.

---

## 🚀 Features

- Secure user authentication using AWS Cognito
- Personal cloud storage using Amazon S3
- Upload, view, and delete files
- Email notifications using AWS SES
- Real-time collaborative code editor
- Multi-user code editing with Socket.IO
- Code auto-saving to S3
- Modern interactive dashboard UI
- Personalized user workspace

---

## 🛠️ Tech Stack

### Frontend
- HTML
- CSS
- JavaScript
- Bootstrap
- Monaco Editor

### Backend
- Node.js
- Express.js
- Socket.IO

### AWS Services
- Amazon Cognito (Authentication)
- Amazon S3 (Cloud Storage)
- Amazon SES (Email Notifications)

---

## 📂 Project Architecture

User → Web Dashboard → Node.js Server → AWS Services

Authentication → Amazon Cognito  
File Storage → Amazon S3  
Email Notifications → Amazon SES  
Real-time Code Sync → Socket.IO  

---

## ⚙️ Installation

1. Clone the repository

git clone https://github.com/yourusername/cloud-craft.git


2. Navigate to the project folder


cd cloud-craft


3. Install dependencies


npm install


4. Create a `.env` file and configure AWS credentials


AWS_ACCESS_KEY=your_access_key
AWS_SECRET_KEY=your_secret_key
AWS_REGION=ap-south-1


5. Run the server


node server.js


6. Open in browser


http://localhost:5500


---



## 🔐 Security Features

- Secure authentication with AWS Cognito
- User-specific storage in S3
- Environment variables for credential protection

---

## 🎯 Project Purpose

This project was developed as a cloud computing application to demonstrate the integration of AWS services with a web application. It provides a practical implementation of cloud storage and collaborative development tools.

---

## 👨‍💻 Authors

Vijay Prakash Khanai  
MCA Student

---

## 📄 License

This project is for educational purposes.

Example section:

## Screenshots
![Dashboard](images/dashboard.png)
