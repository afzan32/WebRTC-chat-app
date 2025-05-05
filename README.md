# WebRTC Real-Time Communication Demo

This project is a demo application that showcases real-time video communication using WebRTC and Socket.IO. Users can join a room, start video calls, chat, mute/unmute their audio and video, and even share their screen.

## Features

- Join a room with a custom ID and username
- Peer-to-peer video calling using WebRTC
- Real-time chat between participants
- Mute/unmute microphone and camera
- Screen sharing functionality
- Auto-disconnect and user leave notifications

## Technologies Used

- HTML, CSS, JavaScript (Frontend)
- WebRTC API (for video/audio communication)
- Socket.IO (for signaling and messaging)
- Node.js with Express (Backend server)

## Project Structure
-/(WebRTC-APP)
-public├── index.html # Main web interface
|       ├── main.css # Styling for UI
|      ├── main.js # WebRTC and UI logic
-server├── server.js # Node.js signaling server
|
-package.json
└── README.md # Project documentation


## Installation and Running the Project

### Prerequisites
- Node.js should be installed on your machine

-----------------------------------------------------------------------
### Steps to Run:

1. Clone the repository:
   git clone https://github.com/afzan32/WebRTC-chat-app.git
   cd WebRTC-APP

2. Install dependencies:
   npm install

3. Run the server:
   node server.js

4. Open your browser and visit:
   http://localhost:3097

5. Enter a room ID and username to start!

