import { Ban, Check, Pencil, Phone, Search, UserPlus, Video, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, messageSearch, setMessageSearch, updateNickname, updateRelationship } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showPhoto, setShowPhoto] = useState(false);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const friends = selectedUser.friendshipStatus === "accepted";
  const saveNickname = async (event) => { event.preventDefault(); await updateNickname(selectedUser._id, nickname); setEditingNickname(false); };

  return <div className="p-2.5 border-b border-base-300">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative"><button className="avatar" onClick={() => setShowPhoto(true)} title="View profile photo"><div className="size-10 rounded-full"><img src={selectedUser.profilePic || "/ramwp.jpg"} alt={selectedUser.fullName} /></div></button>{!selectedUser.isBlocked && selectedUser.friendshipStatus === "none" && <button className="btn btn-primary btn-xs btn-circle absolute -bottom-1 -right-1" title="Add friend" onClick={() => updateRelationship(selectedUser._id, "request")}><UserPlus size={13}/></button>}</div>
        <div><div className="flex items-center gap-1"><h3 className="font-medium">{selectedUser.nickname || selectedUser.fullName}</h3><button className="btn btn-ghost btn-xs btn-circle" title="Set your nickname" onClick={() => { setNickname(selectedUser.nickname || ""); setEditingNickname(true); }}><Pencil size={13}/></button></div><p className="text-sm text-base-content/70">{onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}</p></div>
      </div>
      <div className="flex items-center gap-1"><label className="input input-sm hidden md:flex items-center gap-1"><Search size={14}/><input value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} placeholder="Search messages" /></label><button className="btn btn-ghost btn-sm btn-circle md:hidden" onClick={() => setShowSearch(!showSearch)} title="Search messages"><Search size={19}/></button>{!selectedUser.isBlocked && selectedUser.requestDirection === "received" && <button className="btn btn-success btn-xs" onClick={() => updateRelationship(selectedUser._id, "respond", true)}><Check size={14}/> Accept</button>}{friends && <><button className="btn btn-ghost btn-sm btn-circle" title="Voice call" onClick={() => window.dispatchEvent(new CustomEvent("call:start", { detail: { user: selectedUser, video: false } }))}><Phone size={19}/></button><button className="btn btn-ghost btn-sm btn-circle" title="Video call" onClick={() => window.dispatchEvent(new CustomEvent("call:start", { detail: { user: selectedUser, video: true } }))}><Video size={19}/></button></>}<button className="btn btn-ghost btn-sm btn-circle" title={selectedUser.blockedByMe ? "Unblock user" : "Block user"} onClick={() => updateRelationship(selectedUser._id, "block")}><Ban size={18}/></button><button className="btn btn-ghost btn-sm btn-circle" onClick={() => setSelectedUser(null)}><X /></button></div>
    </div>
    {showSearch && <label className="input input-sm mt-2 flex items-center gap-1 md:hidden"><Search size={14}/><input autoFocus value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} placeholder="Search messages" /></label>}
    {showPhoto && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4" onClick={() => setShowPhoto(false)}><button className="btn btn-circle btn-ghost absolute right-4 top-4 text-white" onClick={() => setShowPhoto(false)}><X /></button><img src={selectedUser.profilePic || "/ramwp.jpg"} alt={`${selectedUser.fullName}'s profile`} className="max-h-full max-w-full rounded-full object-contain" onClick={(event) => event.stopPropagation()} /></div>}
    {editingNickname && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"><form className="w-full max-w-sm rounded-xl bg-base-100 p-5" onSubmit={saveNickname}><h3 className="font-semibold">Set nickname for @{selectedUser.username}</h3><p className="mt-1 text-sm opacity-60">Only you can see this name.</p><input className="input input-bordered mt-4 w-full" maxLength="40" autoFocus value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder={selectedUser.fullName} /><div className="mt-4 flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={() => setEditingNickname(false)}>Cancel</button><button className="btn btn-primary">Save</button></div></form></div>}
  </div>;
};
export default ChatHeader;
