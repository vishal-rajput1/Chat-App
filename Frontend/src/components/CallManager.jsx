import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

const CallManager = () => {
  const { socket, authUser } = useAuthStore();
  const peer = useRef(null); const stream = useRef(null); const remoteRef = useRef(null); const localRef = useRef(null);
  const [call, setCall] = useState(null); // { user, video, incoming }
  const stop = () => {
    peer.current?.close(); peer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null;
    setCall(null);
  };
  const preparePeer = async (video, receiverId) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peer.current = pc;
    pc.onicecandidate = (event) => event.candidate && socket.emit("call:signal", { receiverId, signal: { type: "ice", candidate: event.candidate } });
    pc.ontrack = (event) => { if (remoteRef.current) remoteRef.current.srcObject = event.streams[0]; };
    stream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    stream.current.getTracks().forEach((track) => pc.addTrack(track, stream.current));
    if (localRef.current) localRef.current.srcObject = stream.current;
    return pc;
  };
  useEffect(() => {
    if (!socket) return;
    const begin = async ({ detail }) => {
      try { const pc = await preparePeer(detail.video, detail.user._id); setCall({ ...detail, incoming: false }); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); socket.emit("call:signal", { receiverId: detail.user._id, signal: { type: "offer", sdp: offer, video: detail.video, user: authUser } }); }
      catch { stop(); }
    };
    const signal = async ({ from, signal: data }) => {
      if (data.type === "offer") return setCall({ user: data.user, video: data.video, incoming: true, from, offer: data.sdp });
      if (!peer.current) return;
      if (data.type === "answer") await peer.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.type === "ice") await peer.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    };
    window.addEventListener("call:start", begin); socket.on("call:signal", signal);
    return () => { window.removeEventListener("call:start", begin); socket.off("call:signal", signal); };
  }, [socket, authUser]);
  const accept = async () => {
    try { const pc = await preparePeer(call.video, call.from); setCall((current) => ({ ...current, incoming: false })); await pc.setRemoteDescription(new RTCSessionDescription(call.offer)); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit("call:signal", { receiverId: call.from, signal: { type: "answer", sdp: answer } }); } catch { stop(); }
  };
  if (!call) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-xl rounded-xl bg-base-100 p-5 text-center shadow-2xl"><h2 className="font-semibold">{call.incoming ? `Incoming ${call.video ? "video" : "voice"} call from` : "Calling"} @{call.user.username}</h2><div className="relative mt-4 min-h-52 overflow-hidden rounded-lg bg-black"><video ref={remoteRef} autoPlay playsInline className="h-72 w-full object-cover" /><video ref={localRef} autoPlay muted playsInline className="absolute bottom-2 right-2 h-24 w-32 rounded object-cover" /></div><div className="mt-4 flex justify-center gap-3">{call.incoming && <button className="btn btn-success btn-circle" onClick={accept}><Phone size={20}/></button>}<button className="btn btn-error btn-circle" onClick={stop}><PhoneOff size={20}/></button></div></div></div>;
};
export default CallManager;
