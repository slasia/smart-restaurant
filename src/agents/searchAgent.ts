import { restaurantSearch } from "../tools/serpTool";
import { createAgent, SystemMessage } from "langchain";
import { DEFAULT_CHAT_MODEL, SEARCH_AGENT_SYSTEM_PROMPT } from "../config/aiConfig";

/**
 * Creates an internet search agent for restaurant recommendations
 * This agent uses SerpAPI to search for restaurants on the internet
 */
export async function createSearchAgent() {
  const tools = [restaurantSearch];
  const systemPrompt = new SystemMessage(SEARCH_AGENT_SYSTEM_PROMPT);

  const agent = createAgent({
    model: DEFAULT_CHAT_MODEL,
    tools,
    systemPrompt,
  });

  return agent;
}
