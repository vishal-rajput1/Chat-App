// EmojiPicker.jsx
const emojis = ["😀", "😂", "😍", "😎", "😭", "😡", "👍", "👎", "🔥", "❤️", "🎉", "😴"];

const EmojiPicker = ({ onSelect }) => {
  return (
    <div className="bg-base-200 shadow-lg p-2 rounded-lg grid grid-cols-6 gap-2">
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="text-2xl hover:scale-110 transition-transform"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export default EmojiPicker;
