import Picker from "@emoji-mart/react";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { emojiData } from "../common";

interface EmojiPickerProps {
  children: JSX.Element;
  setInputValue: (value: string) => void;
  inputValue: string;
}

function EmojiPicker({
  children,
  setInputValue,
  inputValue,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!emojiData.value) {
      fetch("https://cdn.jsdelivr.net/npm/@emoji-mart/data")
        .then((response) => response.json())
        .then((data) => {
          emojiData.value = data;
        });
    }
  }, []);

  const handleEmojiSelect = (emoji: any) => {
    setInputValue(inputValue + emoji.native);
  };

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button type="button" onClick={handleButtonClick}>
        {children}
      </button>
      {isOpen && emojiData.value && (
        <Picker
          data={emojiData.value}
          onEmojiSelect={handleEmojiSelect}
          noCountryFlags={true}
        />
      )}
    </>
  );
}

export default EmojiPicker;
