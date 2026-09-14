const socket = io();

const welcome = document.querySelector("#welcome");
const age = document.querySelector("#age");

const videoMode = document.querySelector("#videoMode");
const textMode = document.querySelector("#textMode");

const videoApp = document.querySelector("#videoApp");
const textApp = document.querySelector("#textApp");

const localVideo = document.querySelector("#local");
const remoteVideo = document.querySelector("#remote");
const videoStatus = document.querySelector("#videoStatus");

const textStatus = document.querySelector("#textStatus");
const textMessages = document.querySelector("#textMessages");
const textForm = document.querySelector("#textForm");
const textInput = document.querySelector("#textInput");

const videoNext = document.querySelector("#videoNext");
const videoBack = document.querySelector("#videoBack");
const videoReport = document.querySelector("#videoReport");

const textNext = document.querySelector("#textNext");
const textBack = document.querySelector("#textBack");
const textReport = document.querySelector("#textReport");

let localStream = null;
let pc = null;
let partnerId = null;
let currentMode = null;


// =========================
// START VIDEO CHAT
// =========================

videoMode.onclick = async () => {

  if (!age.checked) {
    alert("Please confirm that you are 18+.");
    return;
  }

  currentMode = "video";

  welcome.classList.add("hidden");
  videoApp.classList.remove("hidden");
  textApp.classList.add("hidden");

  videoStatus.textContent = "🔎 Telugu stranger కోసం searching…";

  try {

    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    localVideo.srcObject = localStream;

  } catch (error) {

    videoStatus.textContent =
      "Camera permission unavailable.";

    alert("Camera & microphone permission allow చేయండి.");

    return;
  }

  socket.emit("joinQueue", {
    mode: "video"
  });
};


// =========================
// START TEXT CHAT
// =========================

textMode.onclick = () => {

  if (!age.checked) {
    alert("Please confirm that you are 18+.");
    return;
  }

  currentMode = "text";

  welcome.classList.add("hidden");
  textApp.classList.remove("hidden");
  videoApp.classList.add("hidden");

  textStatus.textContent =
    "🔎 Telugu stranger కోసం searching…";

  socket.emit("joinQueue", {
    mode: "text"
  });
};


// =========================
// SEARCHING
// =========================

socket.on("searching", () => {

  if (currentMode === "video") {
    videoStatus.textContent =
      "🔎 Telugu stranger కోసం searching…";
  }

  if (currentMode === "text") {
    textStatus.textContent =
      "🔎 Telugu stranger కోసం searching…";
  }
});


// =========================
// MATCHED
// =========================

socket.on("matched", async ({ partner }) => {

  partnerId = partner;

  if (currentMode === "video") {

    videoStatus.textContent =
      "🟢 Connected! Say hi 👋";

    await createPeer(true);
  }

  if (currentMode === "text") {

    textStatus.textContent =
      "🟢 Connected! Say hi 👋";
  }
});


// =========================
// WEBRTC
// =========================

async function createPeer(isInitiator) {

  pc = new RTCPeerConnection({

    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      }
    ]

  });


  if (localStream) {

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

  }


  pc.onicecandidate = event => {

    if (event.candidate && partnerId) {

      socket.emit("signal", {

        to: partnerId,

        data: {
          candidate: event.candidate
        }

      });

    }

  };


  pc.ontrack = event => {

    remoteVideo.srcObject =
      event.streams[0];

  };


  if (isInitiator) {

    const offer =
      await pc.createOffer();

    await pc.setLocalDescription(offer);

    socket.emit("signal", {

      to: partnerId,

      data: {
        sdp: pc.localDescription
      }

    });

  }

}


// =========================
// SIGNALING
// =========================

socket.on("signal", async ({ from, data }) => {

  partnerId = from;

  if (!pc) {

    await createPeer(false);

  }


  if (data.sdp) {

    await pc.setRemoteDescription(data.sdp);


    if (data.sdp.type === "offer") {

      const answer =
        await pc.createAnswer();

      await pc.setLocalDescription(answer);

      socket.emit("signal", {

        to: partnerId,

        data: {
          sdp: pc.localDescription
        }

      });

    }

  }


  if (data.candidate) {

    try {

      await pc.addIceCandidate(
        data.candidate
      );

    } catch (error) {

      console.log(error);

    }

  }

});


// =========================
// TEXT CHAT
// =========================

function addMessage(message, mine = false) {

  const div =
    document.createElement("div");

  div.className =
    "msg " + (mine ? "me" : "");

  const bubble =
    document.createElement("span");

  bubble.className =
    "bubble";

  bubble.textContent =
    message;

  div.appendChild(bubble);

  textMessages.appendChild(div);

  textMessages.scrollTop =
    textMessages.scrollHeight;

}


textForm.onsubmit = event => {

  event.preventDefault();

  const message =
    textInput.value.trim();

  if (!message) return;

  addMessage(message, true);

  socket.emit("chat", message);

  textInput.value = "";

};


socket.on("chat", message => {

  addMessage(message, false);

});


// =========================
// NEXT
// =========================

function goNext() {

  closeVideo();

  partnerId = null;

  if (currentMode === "video") {

    videoStatus.textContent =
      "🔎 Finding a new Telugu stranger…";

  }

  if (currentMode === "text") {

    textMessages.innerHTML = `
      <div class="system">
        New chat started. Be respectful.
      </div>
    `;

    textStatus.textContent =
      "🔎 Finding a new Telugu stranger…";

  }

  socket.emit("next", {
    mode: currentMode
  });

}


videoNext.onclick = goNext;
textNext.onclick = goNext;


// =========================
// BACK
// =========================

function goBack() {

  closeVideo();

  partnerId = null;

  videoApp.classList.add("hidden");
  textApp.classList.add("hidden");
  welcome.classList.remove("hidden");

}


videoBack.onclick = goBack;
textBack.onclick = goBack;


// =========================
// CLOSE VIDEO
// =========================

function closeVideo() {

  if (pc) {

    pc.close();
    pc = null;

  }

  if (remoteVideo) {

    remoteVideo.srcObject = null;

  }

}


// =========================
// PARTNER LEFT
// =========================

socket.on("partnerLeft", () => {

  closeVideo();

  partnerId = null;

  if (currentMode === "video") {

    videoStatus.textContent =
      "Stranger left. Finding someone new…";

    socket.emit("joinQueue", {
      mode: "video"
    });

  }


  if (currentMode === "text") {

    textStatus.textContent =
      "Stranger left. Finding someone new…";

    socket.emit("joinQueue", {
      mode: "text"
    });

  }

});


// =========================
// REPORT
// =========================

videoReport.onclick = () => {

  alert(
    "Report submitted. Thank you."
  );

};


textReport.onclick = () => {

  alert(
    "Report submitted. Thank you."
  );

};
