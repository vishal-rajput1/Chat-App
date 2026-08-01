import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const CallManager = () => {
  const { socket, authUser } = useAuthStore();
  const peer = useRef(null), localStream = useRef(null), remoteStream = useRef(null), pendingIce = useRef([]);
  const localVideo = useRef(null), remoteVideo = useRef(null);
  const [call, setCall] = useState(null);

  useEffect(() => {
    if (localVideo.current && localStream.current) localVideo.current.srcObject = localStream.current;
    if (remoteVideo.current && remoteStream.current) remoteVideo.current.srcObject = remoteStream.current;
  }, [call]);

  const endCall = (notify = true) => {
    if (notify && call?.peerId) socket?.emit("call:signal", { receiverId: call.peerId, signal: { type: "end" } });
    peer.current?.close(); peer.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null; remoteStream.current = null; pendingIce.current = [];
    setCall(null);
  };

  const makePeer = async (video, peerId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peer.current = pc;
    pc.onicecandidate = ({ candidate }) => candidate && socket.emit("call:signal", { receiverId: peerId, signal: { type: "ice", candidate } });
    pc.ontrack = ({ streams }) => { remoteStream.current = streams[0]; if (remoteVideo.current) remoteVideo.current.srcObject = streams[0]; };
    pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState)) endCall(false); };
    localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStream.current.getTracks().forEach((track) => pc.addTrack(track, localStream.current));
    return pc;
  };

  useEffect(() => {
    if (!socket) return;
    const start = async ({ detail }) => {
      try {
        setCall({ user: detail.user, video: detail.video, peerId: detail.user._id, status: "calling" });
        const pc = await makePeer(detail.video, detail.user._id);
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        socket.emit("call:signal", { receiverId: detail.user._id, signal: { type: "offer", sdp: offer, video: detail.video, user: authUser } });
      } catch { endCall(false); }
    };
    const receive = async ({ from, signal }) => {
      if (signal.type === "end") return endCall(false);
      if (signal.type === "offer") return setCall({ user: signal.user, video: signal.video, peerId: from, offer: signal.sdp, status: "incoming" });
      if (!peer.current) {
        if (signal.type === "ice") pendingIce.current.push(new RTCIceCandidate(signal.candidate));
        return;
      }
      if (signal.type === "answer") { await peer.current.setRemoteDescription(new RTCSessionDescription(signal.sdp)); for (const candidate of pendingIce.current) await peer.current.addIceCandidate(candidate); pendingIce.current = []; setCall((current) => ({ ...current, status: "connected" })); }
      if (signal.type === "ice") {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (peer.current.remoteDescription) await peer.current.addIceCandidate(candidate); else pendingIce.current.push(candidate);
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
      for (const candidate of pendingIce.current) await pc.addIceCandidate(candidate); pendingIce.current = [];
      const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
      socket.emit("call:signal", { receiverId: call.peerId, signal: { type: "answer", sdp: answer } });
      setCall((current) => ({ ...current, status: "connected" }));
    } catch { endCall(false); }
  };

  if (!call) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-xl rounded-xl bg-base-100 p-5 text-center shadow-2xl"><h2 className="font-semibold">{call.status === "incoming" ? `Incoming ${call.video ? "video" : "voice"} call from` : call.status === "calling" ? "Calling" : "In call with"} @{call.user.username}</h2><div className="relative mt-4 min-h-52 overflow-hidden rounded-lg bg-black"><video ref={remoteVideo} autoPlay playsInline className={`h-72 w-full object-cover ${call.video ? "" : "hidden"}`} /><div className={!call.video ? "flex h-72 items-center justify-center text-5xl" : "hidden"}>☎</div><video ref={localVideo} autoPlay muted playsInline className={`absolute bottom-2 right-2 h-24 w-32 rounded object-cover ${call.video ? "" : "hidden"}`} /></div><div className="mt-4 flex justify-center gap-3">{call.status === "incoming" && <button className="btn btn-success btn-circle" onClick={accept} title="Answer"><Phone size={20}/></button>}<button className="btn btn-error btn-circle" onClick={() => endCall()} title="End call"><PhoneOff size={20}/></button></div></div></div>;
};
export default CallManager;
