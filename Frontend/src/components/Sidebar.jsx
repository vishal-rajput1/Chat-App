import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Search, Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, receiveUnreadMessage } = useChatStore();

  const { onlineUsers, socket } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (message) => receiveUnreadMessage(message);
    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, receiveUnreadMessage]);

  const filteredUsers = (showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users).filter((user) => user.username?.toLowerCase().includes(search.toLowerCase()));

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className={`h-full ${showMobileSearch ? "w-64" : "w-20"} lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200`}>
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
          <button className="btn btn-ghost btn-xs btn-circle lg:hidden" onClick={() => setShowMobileSearch(!showMobileSearch)} aria-label="Search users"><Search size={18} /></button>
        </div>
        {showMobileSearch && <label className="input input-sm mt-3 flex items-center gap-1 lg:hidden"><Search size={14}/><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Username" /></label>}
        <label className="input input-sm mt-3 hidden lg:flex items-center gap-2">
          <Search size={15} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search @username" />
        </label>
        {/* TODO: Online filter toggle */}
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/ramwp.jpg"}
                alt={user.name}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span
                  className="absolute bottom-0 right-0 size-3 bg-green-500 
                  rounded-full ring-2 ring-zinc-900"
                />
              )}
            </div>

            {/* User info - only visible on larger screens */}
            <div className={`${showMobileSearch ? "block" : "hidden"} lg:block text-left min-w-0`}>
              <div className="font-medium truncate">{user.nickname || user.fullName}</div>
              <div className="text-xs text-primary truncate">@{user.username}</div>
              <div className="text-sm text-zinc-400">
                {user.unreadCount ? `${user.unreadCount} unread` : onlineUsers.includes(user._id) ? "Online" : "Offline"}
              </div>
            </div>
            {user.unreadCount > 0 && <span className="badge badge-primary badge-sm ml-auto">{user.unreadCount > 99 ? "99+" : user.unreadCount}</span>}
          </button>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};
export default Sidebar;
