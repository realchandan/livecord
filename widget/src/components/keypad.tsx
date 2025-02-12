import { FaceSatisfied, Send } from "@carbon/react/icons";
import { isConnected } from "../common";
import EmojiPicker from "./Emojipicker";

interface KeypadProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  addMessage: (text: string) => void;
}

export const Keypad = ({
  inputValue,
  setInputValue,
  addMessage,
}: KeypadProps) => {
  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="bg-[#eaeef3] px-3">
      <form
        onSubmit={handleSubmit}
        className="flex items-center rounded-lg border bg-white p-2 shadow-md"
      >
        <input
          type="text"
          placeholder="Write a message..."
          value={inputValue}
          onChange={(e) => setInputValue((e.target as HTMLInputElement).value)}
          className="w-full bg-transparent px-2 text-[14px] text-gray-700 placeholder:font-normal focus:outline-none"
        />
        <div className="relative ml-2 flex cursor-pointer items-center rounded-full bg-transparent font-bold">
          <EmojiPicker inputValue={inputValue} setInputValue={setInputValue}>
            <FaceSatisfied className="h-6 w-6 duration-300 ease-linear hover:fill-blue-600" />
          </EmojiPicker>

          <button
            className={`ml-1 ${
              inputValue.length > 0 && isConnected.value === true
                ? ""
                : "cursor-not-allowed opacity-30"
            }`}
            type="submit"
            disabled={inputValue.length === 0 || isConnected.value !== true}
          >
            <Send className="h-6 w-6 duration-300 ease-linear hover:fill-blue-600" />
          </button>
        </div>
      </form>
    </div>
  );
};
