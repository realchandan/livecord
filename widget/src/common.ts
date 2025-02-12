import { signal } from "@preact/signals-core";
import type { Socket } from "socket.io-client";
import z from "zod";

const onNewMessageSound =
  "https://commondatastorage.googleapis.com/codeskulptor-assets/week7-brrring.m4a";

enum Sender {
  Owner = 0,
  Visitor = 1,
}

const messageSchema = z.object({
  content: z.string(),
  message_id: z.string(),
  sender: z.nativeEnum(Sender),
  sent_at: z.number(),
  buttons: z.array(z.string()).default([]),
  dots: z.number().default(1000),
});

type MessageType = z.infer<typeof messageSchema>;

const socket = signal<Socket | null>(null);
const isConnected = signal<boolean>(false);
const messages = signal<MessageType[]>([]);

const sendMessage = (text: string) => {
  socket.value?.emit(
    "message",
    new TextEncoder().encode(
      JSON.stringify({
        content: text,
      }),
    ).buffer,
  );

  messages.value = [
    ...messages.value,
    messageSchema.parse({
      content: text,
      message_id: "",
      sender: Sender.Visitor,
      sent_at: Date.now() / 1000,
      dots: 0,
    }),
  ];
};

const emojiData = signal<any>(null);

export {
  emojiData,
  isConnected,
  messages,
  messageSchema,
  onNewMessageSound,
  Sender,
  sendMessage,
  socket,
  type MessageType,
};
