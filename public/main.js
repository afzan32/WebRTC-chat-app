const socket = io({
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  let localStream;
  let peerConnections = {}; 
  let roomId;
  let username;
  let isHost = false;
  let peerUsernames = {};
  let screenStream = null;
  let isScreenSharing = false;
  
  // DOM Elements
  const localVideo = document.getElementById("localVideo");
  const joinButton = document.getElementById("joinButton");
  const micButton = document.getElementById("micButton");
  const cameraButton = document.getElementById("cameraButton");
  const chatbox = document.getElementById("chatbox");
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const pageIdentifier = document.getElementById("page-identifier");
  
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };
  
  // Join a room
  async function joinRoom() {
    roomId = document.getElementById("room").value.trim();
    username = document.getElementById("username").value.trim();
  
    if (!roomId) {
      alert("Please enter a Room ID!");
      return;
    }
  
    if (!username) {
      alert("Please enter a username!");
      return;
    }
  
    try {
      Object.keys(peerConnections).forEach((userId) => {
        if (peerConnections[userId]) {
          peerConnections[userId].close();
          delete peerConnections[userId];
        }
        const oldVideoContainer = document.getElementById(`container-${userId}`);
        if (oldVideoContainer) {
          oldVideoContainer.remove();
        }
      });
  
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
  
      localVideo.srcObject = localStream;
  
      socket.emit("join-room", roomId, username);
  
      document.getElementById("controls").style.display = "flex";
      document.getElementById("chat").style.display = "flex";
      document.getElementById("join-section").style.display = "none";
  
      console.log("Joined room:", roomId);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      alert("Could not access camera or microphone. Please check permissions.");
    }
  }
  
  
  // Create a peer connection for a new user
  function createPeerConnection(userId) {
    // Create new RTCPeerConnection
    const peerConnection = new RTCPeerConnection(iceServers);
  
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `Connection state with ${userId}:`,
        peerConnection.connectionState
      );
    };
  
    peerConnection.oniceconnectionstatechange = () => {
      console.log(
        `ICE connection state with ${userId}:`,
        peerConnection.iceConnectionState
      );
    };
  
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${userId}`);
        socket.emit("ice-candidate", event.candidate, userId);
      }
    };
  
    peerConnection.ontrack = (event) => {
      console.log(`Received track from ${userId}`);
  
      const existingContainer = document.getElementById(`container-${userId}`);
      if (existingContainer) {
        existingContainer.remove();
      }
  
      const videoContainer = document.createElement("div");
      videoContainer.id = `container-${userId}`;
      videoContainer.className = "video-container";
  
      const remoteVideoElement = document.createElement("video");
      remoteVideoElement.id = `remote-${userId}`;
      remoteVideoElement.autoplay = true;
      remoteVideoElement.playsInline = true;
  
      videoContainer.appendChild(remoteVideoElement);
  
      const usernameLabel = document.createElement("div");
      usernameLabel.className = "username-label";
      usernameLabel.textContent = peerUsernames[userId] || "User";
      videoContainer.appendChild(usernameLabel);
  
      document.getElementById("videos").appendChild(videoContainer);
  
      remoteVideoElement.srcObject = event.streams[0];
    };
  
    peerConnections[userId] = peerConnection;
    return peerConnection;
  }
  
  // Toggle microphone
  function toggleMic() {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
  
    if (audioTrack.enabled) {
      micButton.textContent = "Mute voice";
      micButton.classList.remove("muted");
    } else {
      micButton.textContent = "Unmute voice";
      micButton.classList.add("muted");
    }
  }
  
  // Toggle camera
  function toggleCamera() {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
  
    if (videoTrack.enabled) {
      cameraButton.textContent = "Mute video";
      cameraButton.classList.remove("muted");
    } else {
      cameraButton.textContent = "Unmute video";
      cameraButton.classList.add("muted");
    }
  }
  
  // End the call
  function endCall() {
    Object.values(peerConnections).forEach((connection) => {
      connection.close();
    });
  
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
  
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
  
    socket.emit("leave-room");
  
    window.location.reload();
  }
  
  // Send a chat message
  function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
  
    // Send to server
    socket.emit("send-message", message);
  
    displayMessage({
      user: username + (isHost ? "(Host)" : ""),
      text: message,
      senderId: socket.id
    });
  
    messageInput.value = "";
  }
  
  // Display a received message
  function displayMessage(data) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
  
    if (data.senderId === socket.id) {
      messageDiv.classList.add("my-message");
    } else {
      messageDiv.classList.add("receiver-message");
    }
  
    const senderElement = document.createElement("div");
    senderElement.classList.add("sender-name");
    senderElement.textContent = data.user;
    
    const textElement = document.createElement("div");
    textElement.textContent = data.text;
    
    messageDiv.appendChild(senderElement);
    messageDiv.appendChild(textElement);
    
    chatbox.appendChild(messageDiv);
  
    chatbox.scrollTop = chatbox.scrollHeight;
  }
  
  // Update setupPageUI function
  function setupPageUI(isFirstUser) {
      isHost = isFirstUser;
      
      if (isFirstUser) {
          document.body.classList.add("host-page");
          document.querySelector(".username-label").textContent = username + " (Host)";
          document.getElementById("page-identifier").textContent = `${username}'s page (Host)`;
      } else {
          document.body.classList.add("receiver-page");
          document.getElementById("page-identifier").textContent = `${username}'s page`;
      }
  }
  
  // Socket event handlers
  socket.on("user-connected", async (userId, userName) => {
    console.log(`User connected: ${userId} (${userName})`);
    peerUsernames[userId] = userName; 
  
    try {
      const peerConnection = createPeerConnection(userId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
  
      console.log(`Sending offer to ${userId}`);
      socket.emit("offer", offer, userId);
    } catch (error) {
      console.error("Error in user-connected handler:", error);
    }
  });
  
  socket.on("room-users", async (users) => {
    console.log("Existing users in room:", users);
  
    setupPageUI(users.length === 0);
  
    users.forEach((user) => {
      peerUsernames[user.id] = user.username;
      createPeerConnection(user.id);
    });
  });
  
  socket.on("offer", async (offer, senderId) => {
    console.log("Received offer from:", senderId);
  
    try {
      let peerConnection = peerConnections[senderId];
      if (!peerConnection) {
        peerConnection = createPeerConnection(senderId);
      }
  
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
  
      console.log(`Sending answer to ${senderId}`);
      socket.emit("answer", answer, senderId);
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  });
  
  socket.on("answer", async (answer, senderId) => {
    console.log("Received answer from:", senderId);
  
    const peerConnection = peerConnections[senderId];
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    }
  });
  
  socket.on("ice-candidate", async (candidate, senderId) => {
    console.log("Received ICE candidate from:", senderId);
  
    const peerConnection = peerConnections[senderId];
    if (peerConnection) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  });
  
  socket.on("user-disconnected", (userId, userName) => {
    console.log(`User ${userName} (${userId}) disconnected`);
  
    if (peerConnections[userId]) {
      peerConnections[userId].close();
      delete peerConnections[userId];
    }
  
    const videoContainer = document.getElementById(`container-${userId}`);
    if (videoContainer) {
      videoContainer.remove();
    }
  
    displayMessage({
      user: "System",
      text: `${userName} has left the room`,
      senderId: "system"
    });
  });
  
  socket.on("receive-message", (data) => {
    displayMessage(data);
  });
  
  messageInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
  // toggle screen share
  async function toggleScreenShare() {
    const screenButton = document.getElementById('screenShareButton');
  
    if (!isScreenSharing) {
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  
            // Replace video track in each peer connection
            for (let userId in peerConnections) {
                const sender = peerConnections[userId]
                    .getSenders()
                    .find(s => s.track.kind === "video");
                if (sender) {
                    sender.replaceTrack(screenStream.getVideoTracks()[0]);
                }
            }
  
            // Replace local video element stream
            localVideo.srcObject = screenStream;
  
            screenStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };
  
            isScreenSharing = true;
            screenButton.textContent = "Stop Sharing";
        } catch (err) {
            console.error("Error sharing screen:", err);
            alert("Could not share the screen.");
        }
    } else {
        stopScreenShare();
    }
  }
  
  function stopScreenShare() {
    const screenButton = document.getElementById('screenShareButton');
    
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
    }
  
    if (localStream) {
        for (let userId in peerConnections) {
            const sender = peerConnections[userId]
                .getSenders()
                .find(s => s.track.kind === "video");
            if (sender) {
                sender.replaceTrack(localStream.getVideoTracks()[0]);
            }
        }
  
        localVideo.srcObject = localStream;
    }
  
    isScreenSharing = false;
    screenButton.textContent = "Share Screen";
  }
  
  
  // Add this helper function for stopping screen share
  