import { chatModel } from "../models/openai";
import { restaurantSearch } from "../tools/serpTool";
import { createAgent, SystemMessage } from "langchain";

/**
 * Creates an internet search agent for restaurant recommendations
 * This agent uses SerpAPI to search for restaurants on the internet
 */
export async function createSearchAgent() {
  const tools = [restaurantSearch];
  const systemPrompt = new SystemMessage(
    "You are a restaurant recommendation assistant. " +
      "Search for restaurants on the internet using the restaurantSearch tool based on user preferences. " +
      "Format your response in Markdown with restaurant recommendations including name, location, and relevant details."
  );

  const agent = createAgent({
    model: "gpt-4o-mini",
    tools,
    systemPrompt,
  });

  return agent;
}
