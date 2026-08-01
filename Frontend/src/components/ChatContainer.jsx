import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

const ChatContainer = () => {
  const {
  messages,
  getMessages,
  isMessagesLoading,
  selectedUser,
  subscribeToMessages,
  unsubscribeFromMessages,
  editMessage,
  deleteMessage,
} = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  const [editing, setEditing] = useState(null);
const [text, setText] = useState("");
  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEdit = (message) => {
  setEditing(message._id);
  setText(message.text);
};

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/ramwp.jpg"
                      : selectedUser.profilePic || "/ramwp.jpg"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
         <div className="chat-bubble relative flex flex-col">

  {message.image && (
    <img
      src={message.image}
      alt="Attachment"
      className="rounded-lg mb-2 max-w-[220px]"
    />
  )}

  {message.deleted ? (
    <i className="text-sm opacity-60">
      This message was deleted
    </i>
  ) : editing === message._id ? (
    <>
      <input
        className="input input-bordered input-sm w-full"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <button
        className="btn btn-primary btn-sm mt-2"
        onClick={() => {
          editMessage(message._id, text);
          setEditing(null);
        }}
      >
        Save
      </button>
    </>
  ) : (
    <>
      {message.text && <p>{message.text}</p>}

      {message.edited && (
        <span className="text-xs opacity-60 mt-1">
          Edited
        </span>
      )}
    </>
  )}

  {message.senderId === authUser._id && !message.deleted && (
    <div className="dropdown dropdown-end absolute top-1 right-1">
      <button
        tabIndex={0}
        className="btn btn-ghost btn-xs"
      >
        <MoreVertical size={16} />
      </button>

      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box w-36 shadow-lg z-50"
      >
        <li>
          <button onClick={() => handleEdit(message)}>
            <Pencil size={14} />
            Edit
          </button>
        </li>

        <li>
          <button onClick={() => deleteMessage(message._id)}>
            <Trash2 size={14} />
            Delete
          </button>
        </li>
      </ul>
    </div>
  )}

</div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};
export default ChatContainer;