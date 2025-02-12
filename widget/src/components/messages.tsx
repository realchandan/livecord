import { useSignalEffect } from "@preact/signals";
import type { Signal } from "@preact/signals-core";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "preact/hooks";
import { type MessageType, Sender } from "../common";
import { ChatLogo } from "./svgs";

const BouncingDotsLoader = () => {
  return (
    <div className="flex items-center justify-center space-x-1 pt-[10px]">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="size-1 rounded-full bg-gray-500"
          animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 0.6,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 0.2,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

const Message = ({ msg }: { msg: MessageType }) => {
  const isBot = msg.sender === Sender.Owner;

  const [showDots, setShowDots] = useState(false);

  useEffect(() => {
    if (msg.dots !== undefined && msg.dots > 0) {
      setShowDots(true);
      const timer = setTimeout(() => {
        setShowDots(false);
      }, msg.dots);
      return () => clearTimeout(timer);
    }
  }, [msg.dots]);

  return showDots ? (
    <BouncingDotsLoader />
  ) : (
    <div
      className={`my-2 flex w-full flex-col ${
        isBot ? "items-start" : "items-end"
      }`}
    >
      {isBot && (
        <div className="mb-1.5 flex size-4 cursor-pointer items-center rounded-full bg-[#006dfe] p-0.5 transition-colors duration-200 hover:bg-blue-800">
          {ChatLogo}
        </div>
      )}

      <div
        className={`group relative w-fit max-w-[70%] rounded-lg px-3 py-3 shadow-sm ${
          isBot ? "bg-white text-gray-800" : "bg-blue-600 text-white"
        }`}
      >
        <div
          className={`absolute top-1 ${
            isBot ? "-right-[70px]" : "-left-[70px]"
          } flex w-[65px] items-center justify-center rounded-md bg-white py-0.5 opacity-0 shadow-xl duration-300 group-hover:opacity-100`}
        >
          <span className="text-xs text-black">
            {new Date(msg.sent_at * 1000).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <p className="overflow-hidden text-sm">{msg.content}</p>
      </div>
    </div>
  );
};

interface MessagesProps {
  messages: Signal<MessageType[]>;
  addMessage: (text: string) => void;
}

export const Messages = ({ messages, addMessage }: MessagesProps) => {
  const messageAreaRef = useRef<HTMLDivElement | null>(null);

  useSignalEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  });

  useEffect(() => {
    if (messageAreaRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    }
  });

  return (
    <div className="flex h-full w-full bg-[#eaeef3] shadow-lg">
      <div ref={messageAreaRef} className="flex-1 overflow-y-auto p-3">
        {messages.value.map((message) => (
          <div key={message.message_id}>
            <Message msg={message} />
            {message.buttons.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {message.buttons.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-2xl border border-blue-600 bg-white px-3 py-1 text-sm text-blue-600 transition hover:bg-blue-600 hover:text-white"
                    onClick={() => addMessage(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
