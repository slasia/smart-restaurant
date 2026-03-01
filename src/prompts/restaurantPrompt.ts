/**
 * Prompt template for the restaurant recommendation agent
 * Used to create the initial message sent to the LLM
 */
export const RESTAURANT_PROMPT_TEMPLATE = (userQuery: string): string => {
  return `Based on user preferences, suggest restaurants by searching on Google using the serpapi tool, the output format should be in MD. User preferences: ${userQuery}`;
};
