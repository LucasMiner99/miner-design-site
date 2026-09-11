(() => {
  "use strict";

  const PEER_PREFIX = "minershare-";

  const els = {
    homeView: document.getElementById("homeView"),
    hostView: document.getElementById("hostView"),
    joinView: document.getElementById("joinView"),
    viewerView: document.getElementById("viewerView"),
    showHostBtn: document.getElementById("showHostBtn"),
    showJoinBtn: document.getElementById("showJoinBtn"),
    startHostBtn: document.getElementById("startHostBtn"),
    stopHostBtn: document.getElementById("stopHostBtn"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    joinBtn: document.getElementById("joinBtn"),
    leaveBtn: document.getElementById("leaveBtn"),
    resolutionSelect: document.getElementById("resolutionSelect"),
    fpsSelect: document.getElementById("fpsSelect"),
    bitrateSelect: document.getElementById("bitrateSelect"),
    hostLiveCard: document.getElementById("hostLiveCard"),
    roomCodeText: document.getElementById("roomCodeText"),
    hostQualityText: document.getElementById("hostQualityText"),
    hostStatusDot: document.getElementById("hostStatusDot"),
    hostStatusText: document.getElementById("hostStatusText"),
    roomInput: document.getElementById("roomInput"),
    joinStatus: document.getElementById("joinStatus"),
    remoteVideo: document.getElementById("remoteVideo"),
    videoPlaceholder: document.getElementById("videoPlaceholder"),
    viewerStatus: document.getElementById("viewerStatus"),
    toast: document.getElementById("toast")
  };

  let peer = null;
  let displayStream = null;
  let activeCall = null;
  let controlConnection = null;
  let roomCode = "";
  let toastTimer = null;
  let mode = "idle";

  function showView(name) {
    [els.homeView, els.hostView, els.joinView, els.viewerView].forEach((el) => el.classList.add("hidden"));
    els[name].classList.remove("hidden");
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 1800);
  }

  function setJoinStatus(message, isError = false) {
    els.joinStatus.textContent = message;
    els.joinStatus.classList.remove("hidden", "error");
    if (isError) els.joinStatus.classList.add("error");
  }

  function randomCode(length = 10) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let result = "";
    for (const byte of bytes) result += alphabet[byte % alphabet.length];
    return result;
  }

  function formatCode(code) {
    const clean = code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (clean.length <= 4) return clean;
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }

  function normalizeRoomInput(value) {
    let raw = value.trim();

    try {
      if (/^https?:\/\//i.test(raw)) {
        const url = new URL(raw);
        raw = url.searchParams.get("room") || "";
      }
    } catch (_) {}

    raw = raw.replace(/^minershare-/i, "");
    return raw.replace(/[^a-z0-9]/gi, "").toUpperCase();
  }

  function roomUrl(code) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("room", code);
    return url.toString();
  }

  function makeVideoConstraints() {
    const fps = Number(els.fpsSelect.value);
    const resolution = els.resolutionSelect.value;

    const video = {
      frameRate: { ideal: fps, max: fps }
    };

    if (resolution === "720") {
      video.width = { ideal: 1280, max: 1280 };
      video.height = { ideal: 720, max: 720 };
    } else if (resolution === "1080") {
      video.width = { ideal: 1920, max: 1920 };
      video.height = { ideal: 1080, max: 1080 };
    }

    return video;
  }

  async function captureDisplay() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported in this browser. Try Chrome or Edge.");
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: makeVideoConstraints(),
      audio: {
        systemAudio: "include",
        suppressLocalAudioPlayback: false
      },
      systemAudio: "include",
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include"
    });

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      try { videoTrack.contentHint = Number(els.fpsSelect.value) >= 60 ? "motion" : "detail"; } catch (_) {}
    }

    return stream;
  }

  function destroyPeer() {
    try { controlConnection?.close(); } catch (_) {}
    controlConnection = null;

    try { activeCall?.close(); } catch (_) {}
    activeCall = null;

    if (peer && !peer.destroyed) {
      try { peer.destroy(); } catch (_) {}
    }
    peer = null;
  }

  function stopDisplayTracks() {
    if (displayStream) {
      displayStream.getTracks().forEach((track) => track.stop());
      displayStream = null;
    }
  }

  async function applyBitrate(mediaConnection) {
    const bitrateKbps = Number(els.bitrateSelect.value);
    const pc = mediaConnection?.peerConnection;
    if (!pc || !Number.isFinite(bitrateKbps)) return;

    const tryApply = async () => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) return;

      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = bitrateKbps * 1000;
        await sender.setParameters(params);
      } catch (error) {
        console.warn("Could not set custom bitrate:", error);
      }
    };

    await tryApply();
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") tryApply();
    });
  }

  function updateHostConnected(connected) {
    els.hostStatusDot.classList.toggle("connected", connected);
    els.hostStatusDot.classList.toggle("waiting", !connected);
    els.hostStatusText.textContent = connected ? "Viewer connected" : "Waiting for viewer…";
  }

  function handlePeerError(error, context = "Connection error") {
    console.error(error);
    const type = error?.type || "";

    if (type === "peer-unavailable") {
      setJoinStatus("Room not found. Check the code and try again.", true);
      return;
    }

    if (type === "unavailable-id") {
      if (mode === "host") {
        stopHost(false);
        showView("hostView");
        showToast("Room code collision. Try again.");
      }
      return;
    }

    if (mode === "viewer") {
      setJoinStatus(`${context}. Try again.`, true);
    } else {
      showToast(`${context}.`);
    }
  }

  async function startHost() {
    els.startHostBtn.disabled = true;
    els.startHostBtn.textContent = "Choose a screen…";
    mode = "host";

    try {
      displayStream = await captureDisplay();
      const code = randomCode();
      roomCode = code;

      peer = new Peer(`${PEER_PREFIX}${code}`);

      peer.on("open", () => {
        const settings = displayStream.getVideoTracks()[0]?.getSettings?.() || {};
        const actualWidth = settings.width;
        const actualHeight = settings.height;
        const actualFps = settings.frameRate;

        els.roomCodeText.textContent = formatCode(code);
        const resolutionText = actualHeight ? `${actualHeight}p` : (els.resolutionSelect.value === "original" ? "Original" : `${els.resolutionSelect.value}p`);
        const fpsText = actualFps ? `${Math.round(actualFps)} FPS` : `${els.fpsSelect.value} FPS`;
        els.hostQualityText.textContent = `${resolutionText} · ${fpsText}`;
        els.hostLiveCard.classList.remove("hidden");
        els.startHostBtn.classList.add("hidden");
        updateHostConnected(false);

        const url = new URL(window.location.href);
        url.searchParams.set("room", code);
        history.replaceState({}, "", url);
      });

      peer.on("connection", (conn) => {
        conn.on("open", () => {
          controlConnection = conn;
        });

        conn.on("data", (data) => {
          if (!data || data.type !== "join" || !data.viewerId || !displayStream) return;

          if (activeCall) {
            try { activeCall.close(); } catch (_) {}
          }

          updateHostConnected(true);
          activeCall = peer.call(data.viewerId, displayStream, {
            metadata: { type: "screen-share" }
          });

          applyBitrate(activeCall);

          activeCall.on("close", () => {
            activeCall = null;
            updateHostConnected(false);
          });

          activeCall.on("error", (error) => {
            console.error("Media call error:", error);
            activeCall = null;
            updateHostConnected(false);
          });
        });

        conn.on("close", () => {
          if (controlConnection === conn) controlConnection = null;
          updateHostConnected(false);
        });
      });

      peer.on("error", (error) => handlePeerError(error));

      displayStream.getVideoTracks()[0]?.addEventListener("ended", () => stopHost(true));
    } catch (error) {
      console.error(error);
      stopDisplayTracks();
      destroyPeer();
      mode = "idle";
      if (error?.name !== "NotAllowedError") {
        showToast(error?.message || "Could not start screen sharing.");
      }
    } finally {
      els.startHostBtn.disabled = false;
      els.startHostBtn.textContent = "Start sharing";
    }
  }

  function stopHost(showMessage = true) {
    destroyPeer();
    stopDisplayTracks();
    roomCode = "";
    mode = "idle";

    els.hostLiveCard.classList.add("hidden");
    els.startHostBtn.classList.remove("hidden");
    updateHostConnected(false);

    const url = new URL(window.location.href);
    url.searchParams.delete("room");
    history.replaceState({}, "", url);

    if (showMessage) showToast("Sharing stopped");
  }

  async function copyRoomLink() {
    if (!roomCode) return;
    const link = roomUrl(roomCode);

    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copied");
    } catch (_) {
      window.prompt("Copy this link:", link);
    }
  }

  function joinRoom() {
    const code = normalizeRoomInput(els.roomInput.value);
    if (!code) {
      setJoinStatus("Enter a room code first.", true);
      return;
    }

    els.roomInput.value = formatCode(code);
    els.joinBtn.disabled = true;
    els.joinBtn.textContent = "Connecting…";
    setJoinStatus("Connecting to host…");
    mode = "viewer";

    destroyPeer();
    peer = new Peer();

    peer.on("open", (viewerId) => {
      controlConnection = peer.connect(`${PEER_PREFIX}${code}`, {
        reliable: true,
        metadata: { type: "viewer-control" }
      });

      controlConnection.on("open", () => {
        controlConnection.send({ type: "join", viewerId });
        showView("viewerView");
        els.viewerStatus.classList.remove("live");
        els.viewerStatus.lastChild.textContent = " Connecting…";
      });

      controlConnection.on("close", () => {
        if (mode === "viewer" && !activeCall) {
          leaveViewer(false);
          showView("joinView");
          setJoinStatus("The host disconnected.", true);
        }
      });

      controlConnection.on("error", (error) => {
        console.error("Control connection error:", error);
      });
    });

    peer.on("call", (call) => {
      activeCall = call;
      call.answer();

      call.on("stream", async (stream) => {
        els.remoteVideo.srcObject = stream;
        els.videoPlaceholder.classList.add("hidden");
        els.viewerStatus.classList.add("live");
        els.viewerStatus.lastChild.textContent = " Live";

        try {
          await els.remoteVideo.play();
        } catch (error) {
          console.warn("Autoplay was blocked. Viewer can press play manually.", error);
        }
      });

      call.on("close", () => {
        if (mode === "viewer") {
          els.viewerStatus.classList.remove("live");
          els.viewerStatus.lastChild.textContent = " Stream ended";
          els.videoPlaceholder.classList.remove("hidden");
          els.videoPlaceholder.querySelector("p").textContent = "Stream ended";
          els.remoteVideo.srcObject = null;
        }
      });

      call.on("error", (error) => {
        console.error("Media call error:", error);
      });
    });

    peer.on("error", (error) => {
      handlePeerError(error, "Could not connect");
      els.joinBtn.disabled = false;
      els.joinBtn.textContent = "Join";
    });
  }

  function leaveViewer(showMessage = false) {
    mode = "idle";
    destroyPeer();

    if (els.remoteVideo.srcObject) {
      els.remoteVideo.srcObject = null;
    }

    els.videoPlaceholder.classList.remove("hidden");
    els.videoPlaceholder.querySelector("p").textContent = "Waiting for stream…";
    els.viewerStatus.classList.remove("live");
    els.viewerStatus.lastChild.textContent = " Connecting…";
    els.joinBtn.disabled = false;
    els.joinBtn.textContent = "Join";

    if (showMessage) showToast("Left room");
  }

  function goHome() {
    if (mode === "host") stopHost(false);
    if (mode === "viewer") leaveViewer(false);
    mode = "idle";
    showView("homeView");
  }

  els.showHostBtn.addEventListener("click", () => showView("hostView"));
  els.showJoinBtn.addEventListener("click", () => showView("joinView"));
  document.querySelectorAll("[data-back]").forEach((btn) => btn.addEventListener("click", goHome));
  els.startHostBtn.addEventListener("click", startHost);
  els.stopHostBtn.addEventListener("click", () => stopHost(true));
  els.copyLinkBtn.addEventListener("click", copyRoomLink);
  els.joinBtn.addEventListener("click", joinRoom);
  els.leaveBtn.addEventListener("click", () => {
    leaveViewer(true);
    showView("joinView");
  });

  els.roomInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !els.joinBtn.disabled) joinRoom();
  });

  window.addEventListener("beforeunload", () => {
    destroyPeer();
    stopDisplayTracks();
  });

  const roomFromUrl = new URL(window.location.href).searchParams.get("room");
  if (roomFromUrl) {
    els.roomInput.value = formatCode(normalizeRoomInput(roomFromUrl));
    showView("joinView");
  }
})();
