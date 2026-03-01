import { ChatOpenAI } from "@langchain/openai";
import { DEFAULT_CHAT_MODEL } from "../config/aiConfig";

const model = new ChatOpenAI({
  model: DEFAULT_CHAT_MODEL,
  apiKey: process.env.OPENAI_API_KEY,
});

export const chatModel = model;
