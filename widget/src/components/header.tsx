import { CloseLarge, OverflowMenuHorizontal } from "@carbon/react/icons";
import {
  type MotionProps,
  AnimatePresence as OriginalAnimatePresence,
  motion,
} from "framer-motion";
import { useState } from "preact/hooks";
import { LuVolumeX } from "react-icons/lu";
import { MdOutlineVolumeUp } from "react-icons/md";
import { ChatLogo } from "./svgs";

const AnimatePresence =
  OriginalAnimatePresence as unknown as preact.FunctionComponent<{
    children: preact.ComponentChildren;
  }>;

type PreactMotionProps = Omit<MotionProps, "children"> & {
  children?: preact.ComponentChildren;
  className?: string;
  onClick?: (event: MouseEvent) => void;
  onKeyPress?: (event: KeyboardEvent) => void;
};

const MotionDiv = motion.div as preact.FunctionComponent<PreactMotionProps>;

interface HeaderProps {
  setChatBotOpen: (chatBotOpen: boolean) => void;
  soundOn: boolean;
  setSoundOn: (soundOn: boolean) => void;
}

export const Header = ({
  setChatBotOpen,
  soundOn,
  setSoundOn,
}: HeaderProps) => {
  const [headerOpen, setHeaderOpen] = useState(false);

  const toggleSound = () => {
    setSoundOn(!soundOn);
    setHeaderOpen(false);
  };

  return (
    <div className="top-0 left-0 flex w-full items-center justify-between gap-1 px-3 py-5 text-black shadow-2xl">
      <button onClick={() => setHeaderOpen(!headerOpen)} type="submit">
        <OverflowMenuHorizontal className="h-8 w-8" />
      </button>
      <AnimatePresence>
        {headerOpen && (
          <MotionDiv
            initial={{ y: -70, scale: 0, x: -70 }}
            animate={{ y: 0, scale: 1, x: 0 }}
            exit={{ y: -70, scale: 0, x: -70 }}
            className="absolute top-14 left-[50%] z-10 w-[220px] -translate-x-1/2 transform rounded-xl border border-gray-200 bg-white shadow-2xl"
          >
            <div class="flex w-full flex-col justify-center gap-2 p-1">
              <button
                type="button"
                onClick={toggleSound}
                class="flex w-full cursor-pointer items-center justify-between rounded-[8px] p-2 text-sm text-black/80 duration-200 hover:bg-[rgb(71,71,71)] hover:text-white"
              >
                <div class="flex items-center justify-start gap-2">
                  {soundOn ? <MdOutlineVolumeUp /> : <LuVolumeX />}
                  <span>Sound</span>
                </div>

                <div
                  class={`group relative flex h-6 w-11 cursor-pointer rounded-full bg-[rgb(148,148,148)] p-1 transition-colors duration-200 ease-in-out ${
                    soundOn && "bg-[rgb(38,135,80)]"
                  }`}
                >
                  <span
                    class={`pointer-events-none inline-block size-4 transform ${
                      soundOn ? "translate-x-5" : "translate-x-0"
                    } rounded-full bg-[#fff] ring-0 shadow-lg transition duration-200 ease-in-out`}
                  />
                </div>
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
      <div class="flex items-center justify-center gap-1">
        <div class="flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#006dfe] p-2 transition-colors duration-200 hover:bg-blue-800">
          {ChatLogo}
        </div>
        <p class="text-2xl font-bold">Live Chat</p>
      </div>
      <button
        type="button"
        onClick={() => setChatBotOpen(false)}
        class="cursor-pointer text-[32px]"
      >
        <CloseLarge className="h-8 w-8" />
      </button>
    </div>
  );
};
