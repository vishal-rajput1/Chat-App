import { Phone, Search, Video, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, messageSearch, setMessageSearch } = useChatStore();
  const { onlineUsers } = useAuthStore();

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/ramwp.jpg"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70">
              {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1"><label className="input input-sm hidden md:flex items-center gap-1"><Search size={14}/><input value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)} placeholder="Search messages" /></label><button className="btn btn-ghost btn-sm btn-circle" title="Voice call" onClick={() => window.dispatchEvent(new CustomEvent("call:start", { detail: { user: selectedUser, video: false } }))}><Phone size={19}/></button><button className="btn btn-ghost btn-sm btn-circle" title="Video call" onClick={() => window.dispatchEvent(new CustomEvent("call:start", { detail: { user: selectedUser, video: true } }))}><Video size={19}/></button><button className="btn btn-ghost btn-sm btn-circle" onClick={() => setSelectedUser(null)}><X /></button></div>
      </div>
    </div>
  );
};
export default ChatHeader;
