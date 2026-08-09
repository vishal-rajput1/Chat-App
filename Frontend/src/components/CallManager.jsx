import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Phone, PhoneOff } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";

const CallManager = () => {
  const { socket, authUser } = useAuthStore();
  const peer = useRef(null), localStream = useRef(null), remoteStream = useRef(null), pendingIce = useRef([]), callTimer = useRef(null);
  const localVideo = useRef(null), remoteVideo = useRef(null);
  const [call, setCall] = useState(null);
  const callRef = useRef(null);
  const [minimized, setMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => { callRef.current = call; }, [call]);
  useEffect(() => {
    if (call?.status !== "connected" || !call.connectedAt) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - call.connectedAt) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [call?.status, call?.connectedAt]);

  useEffect(() => {
    if (localVideo.current && localStream.current) localVideo.current.srcObject = localStream.current;
    if (remoteVideo.current && remoteStream.current) remoteVideo.current.srcObject = remoteStream.current;
  }, [call]);

  const endCall = (notify = true) => {
    const activeCall = callRef.current;
    clearTimeout(callTimer.current);
    if (notify && activeCall?.peerId) socket?.emit("call:signal", { receiverId: activeCall.peerId, signal: { type: "end" } });
    if (activeCall?.isInitiator) {
      const duration = activeCall.connectedAt ? Math.floor((Date.now() - activeCall.connectedAt) / 1000) : 0;
      axiosInstance.post(`/messages/call/${activeCall.peerId}`, { type: activeCall.video ? "video" : "voice", status: activeCall.status === "connected" ? "completed" : "missed", duration })
        .then(() => useChatStore.getState().getMessages(activeCall.peerId)).catch(() => {});
    }
    peer.current?.close(); peer.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null; remoteStream.current = null; pendingIce.current = [];
    setCall(null); setMinimized(false);
  };

  const makePeer = async (video, peerId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peer.current = pc;
    pc.onicecandidate = ({ candidate }) => candidate && socket.emit("call:signal", { receiverId: peerId, signal: { type: "ice", candidate } });
    pc.ontrack = ({ streams }) => { remoteStream.current = streams[0]; if (remoteVideo.current) remoteVideo.current.srcObject = streams[0]; };
    // Browsers can briefly report "disconnected" during ICE negotiation; do not end the call automatically.
    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));
    return pc;
  };

  const addCandidates = async (pc, candidates) => {
    for (const candidate of candidates) {
      try { await pc.addIceCandidate(candidate); } catch (error) { console.warn("Ignoring invalid ICE candidate", error); }
    }
  };

  useEffect(() => {
    if (!socket) return;
    const start = async ({ detail }) => {
      try {
        setCall({ user: detail.user, video: detail.video, peerId: detail.user._id, status: "calling", isInitiator: true });
        clearTimeout(callTimer.current);
        callTimer.current = setTimeout(() => endCall(), 30000);
        const pc = await makePeer(detail.video, detail.user._id);
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        socket.emit("call:signal", { receiverId: detail.user._id, signal: { type: "offer", sdp: offer, video: detail.video, user: authUser } });
      } catch { endCall(false); }
    };
    const receive = async ({ from, signal }) => {
      if (signal.type === "end") return endCall(false);
      if (signal.type === "offer") {
        clearTimeout(callTimer.current);
        callTimer.current = setTimeout(() => endCall(), 30000);
        return setCall({ user: signal.user, video: signal.video, peerId: from, offer: signal.sdp, status: "incoming", isInitiator: false });
      }
      if (!peer.current) {
        if (signal.type === "ice") pendingIce.current.push(new RTCIceCandidate(signal.candidate));
        return;
      }
      if (signal.type === "answer") { await peer.current.setRemoteDescription(new RTCSessionDescription(signal.sdp)); await addCandidates(peer.current, pendingIce.current); pendingIce.current = []; clearTimeout(callTimer.current); setCall((current) => ({ ...current, status: "connected", connectedAt: Date.now() })); }
      if (signal.type === "ice") {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (peer.current.remoteDescription) await addCandidates(peer.current, [candidate]); else pendingIce.current.push(candidate);
      }
    };
    window.addEventListener("call:start", start); socket.on("call:signal", receive);
    return () => { window.removeEventListener("call:start", start); socket.off("call:signal", receive); };
  }, [socket, authUser]);

  const accept = async () => {
    try {
      setCall((current) => ({ ...current, status: "connecting" }));
      const pc = await makePeer(call.video, call.peerId);
      await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
      await addCandidates(pc, pendingIce.current); pendingIce.current = [];
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      socket.emit("call:signal", { receiverId: call.peerId, signal: { type: "answer", sdp: answer } });
      clearTimeout(callTimer.current);
      setCall((current) => ({ ...current, status: "connected", connectedAt: Date.now() }));
    } catch { endCall(false); }
  };

  if (!call) return null;
  const durationText = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  if (minimized) return <button onClick={() => setMinimized(false)} className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-content shadow-xl"><Phone size={18}/> @{call.user.username} {call.status === "connected" && durationText}<Maximize2 size={17}/></button>;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-xl rounded-xl bg-base-100 p-5 text-center shadow-2xl"><div className="flex items-center justify-end"><button className="btn btn-ghost btn-sm btn-circle" onClick={() => setMinimized(true)} title="Minimize call"><Minimize2 size={18}/></button></div><h2 className="font-semibold">{call.status === "incoming" ? `Incoming ${call.video ? "video" : "voice"} call from` : call.status === "calling" ? "Calling" : "In call with"} @{call.user.username}</h2>{call.status === "connected" && <p className="mt-1 text-sm opacity-60">{durationText}</p>}{call.status !== "connected" && <p className="mt-1 text-sm opacity-60">Call ends automatically in 30 seconds if unanswered.</p>}<div className="relative mt-4 min-h-52 overflow-hidden rounded-lg bg-black"><video ref={remoteVideo} autoPlay playsInline className={`h-72 w-full object-cover ${call.video ? "" : "hidden"}`} /><div className={!call.video ? "flex h-72 items-center justify-center text-5xl" : "hidden"}>☎</div><video ref={localVideo} autoPlay muted playsInline className={`absolute bottom-2 right-2 h-24 w-32 rounded object-cover ${call.video ? "" : "hidden"}`} /></div><div className="mt-4 flex justify-center gap-3">{call.status === "incoming" && <button className="btn btn-success btn-circle" onClick={accept} title="Answer"><Phone size={20}/></button>}<button className="btn btn-error btn-circle" onClick={() => endCall()} title="End call"><PhoneOff size={20}/></button></div></div></div>;
};
export default CallManager;
