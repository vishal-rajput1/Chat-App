import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Image, Mic, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, replyTo, setReplyTo, sendTyping } = useChatStore();
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        replyTo: replyTo?._id,
      });

      // Clear form
      setText("");
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setReplyTo(null);
      sendTyping(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const acceptDroppedFile = (file) => {
    if (!file?.type.startsWith("image/")) return toast.error("Drop an image file");
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const toggleRecording = async () => {
    if (isRecording) return recorder.current?.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const reader = new FileReader();
        reader.onloadend = () => sendMessage({ audio: reader.result });
        reader.readAsDataURL(new Blob(chunks, { type: "audio/webm" }));
        setIsRecording(false);
      };
      recorder.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch { toast.error("Microphone permission is required for voice messages"); }
  };

  return (
    <div className="p-4 w-full" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); acceptDroppedFile(e.dataTransfer.files[0]); }}>
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}
      {replyTo && <div className="mb-2 flex justify-between rounded border-l-4 border-primary bg-base-200 px-3 py-2 text-xs"><span>Replying to: {replyTo.text || "Attachment"}</span><button type="button" onClick={() => setReplyTo(null)}><X size={14}/></button></div>}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => { setText(e.target.value); sendTyping(Boolean(e.target.value)); }}
          />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
          <button type="button" className={`btn btn-circle ${isRecording ? "btn-error" : "text-zinc-400"}`} onClick={toggleRecording} title="Voice message">
            <Mic size={18} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};
export default MessageInput;
