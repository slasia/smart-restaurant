/**
 * Prompt template for the cuisine agent
 * Used to create the initial message sent to the LLM
 */
export const CUISINE_PROMPT_TEMPLATE = (userQuery: string): string => {
  return `Based on user preferences, suggest restaurants by searching on Google using the serpapi tool, the output format should be in MD. User preferences: ${userQuery}`;
};

