import { openAIModel } from "../llms/openIA";
import { restaurantSearch } from "../tools/serpTool";
import { StateAnnotation } from "../graph/type";

export async function cuisineAgentNode(
  state: StateAnnotation.State
): Promise<StateAnnotation.State> {
  const llmWithTools = openAIModel.bindTools([restaurantSearch]);
  // Crear el mensaje inicial
  const messages = [
    {
      role: "user",
      content: `Based on user preferences, suggest types of cuisines by searching on Google using the serpapi tool user preferences: ${state.userQuery}`,
    },
  ];

  const response = await llmWithTools.invoke(messages);
  let result = "";
  
  if (response.tool_calls && response.tool_calls.length > 0) {
    for (const message of response.tool_calls) {
      console.log(`[cuisineAgent] Processing tool call: ${message.name}`);
      console.log(`[cuisineAgent] Tool call args:`, message.args);
      try {
        const toolCall = message.name;
        if (toolCall === "search") {
          console.log(`[cuisineAgent] Executing search tool`);
          result = await restaurantSearch.invoke(
            message.args.input || message.args
          );
          console.log(`[cuisineAgent] Search tool result received`);
        } else {
          console.log(`[cuisineAgent] Tool ${toolCall} not found`);
          result = `Tool ${toolCall} not found`;
        }
      } catch (error) {
        console.error(`[cuisineAgent] Error executing tool call:`, error);
        result = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }
  
  return { userQuery: state.userQuery, cuisinePreferences: result };
}

