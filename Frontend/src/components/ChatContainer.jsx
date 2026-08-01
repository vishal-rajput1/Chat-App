import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck, CornerUpLeft, MoreVertical, Pencil, Smile, Trash2, X } from "lucide-react";

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
  reactToMessage,
  setReplyTo,
  isTyping,
  messageSearch,
} = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const isInitialScroll = useRef(true);

  useEffect(() => {
    isInitialScroll.current = true;
    getMessages(selectedUser._id);

    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  const [editing, setEditing] = useState(null);
const [text, setText] = useState("");
  const [previewImage, setPreviewImage] = useState(null);
  useEffect(() => {
    if (messageEndRef.current && messages) {
      // Opening a chat should jump to its newest message, not visibly travel from the top.
      messageEndRef.current.scrollIntoView({ behavior: isInitialScroll.current ? "auto" : "smooth", block: "end" });
      isInitialScroll.current = false;
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
        {messages.filter((message) => !messageSearch || message.text?.toLowerCase().includes(messageSearch.toLowerCase())).map((message) => (
          <div
  className={`chat group ${
    message.senderId === authUser._id
      ? "chat-end"
      : "chat-start"
  }`}
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
         <div className="chat-bubble relative flex flex-col max-w-xs sm:max-w-md">
  {message.replyTo && <div className="mb-2 rounded border-l-2 border-primary bg-base-200/70 px-2 py-1 text-xs opacity-80">↩ {message.replyTo.deleted ? "This message was deleted" : message.replyTo.text || "Attachment"}</div>}
  {message.image && (
    <img
      src={message.image}
      alt="Attachment"
      className="rounded-lg mb-2 max-w-55 cursor-zoom-in"
      onClick={() => setPreviewImage(message.image)}
    />
  )}

  {message.audio && <audio controls src={message.audio} className="mt-1 max-w-full" />}
  {message.reactions?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{Object.entries(message.reactions.reduce((all, reaction) => ({ ...all, [reaction.emoji]: (all[reaction.emoji] || 0) + 1 }), {})).map(([emoji, count]) => <button key={emoji} onClick={() => reactToMessage(message._id, emoji)} className="rounded-full bg-base-200 px-1.5 text-xs">{emoji} {count}</button>)}</div>}
  <div className="mt-1 flex items-center gap-1 text-xs opacity-60"><button onClick={() => setReplyTo(message)} title="Reply"><CornerUpLeft size={14}/></button><button onClick={() => reactToMessage(message._id, "👍")} title="React"><Smile size={14}/></button>{message.senderId === authUser._id && (message.seen ? <CheckCheck size={15} className="text-primary"/> : message.delivered ? <CheckCheck size={15}/> : <Check size={15}/>)}</div>

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

  {message.senderId === authUser._id && (
  <div className="absolute top-1 right-1 dropdown dropdown-end">
    <button
      tabIndex={0}
      className="btn btn-ghost btn-xs btn-circle opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
    >
      <MoreVertical size={15} />
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
        <div ref={messageEndRef} />
      </div>
      {isTyping && <div className="px-5 pb-1 text-xs italic text-base-content/60">@{selectedUser.username} is typing…</div>}

      <MessageInput />
      {previewImage && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
        <button className="btn btn-circle btn-ghost absolute right-4 top-4 text-white" onClick={() => setPreviewImage(null)} aria-label="Close image preview"><X /></button>
        <img src={previewImage} alt="Full image preview" className="max-h-full max-w-full rounded-lg object-contain" onClick={(event) => event.stopPropagation()} />
      </div>}
    </div>
  );
};
export default ChatContainer;
