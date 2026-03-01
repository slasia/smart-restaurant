export const RAG_EMBEDDING_MODEL = "text-embedding-3-large";

export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

export const RAG_AGENT_MODEL = "gpt-5";

export const RAG_TOOL_DESCRIPTION = "Retrieve information related to a query.";

export const RAG_SYSTEM_PROMPT =
  "You have access to a tool that retrieves context from a document with restaurants from tandil. " +
  "Use the tool to help answer user queries. if you cant found an option, please return false";

export const SEARCH_AGENT_SYSTEM_PROMPT =
  "You are a restaurant recommendation assistant. " +
  "Search for restaurants on the internet using the restaurantSearch tool based on user preferences. " +
  "Format your response in Markdown with restaurant recommendations including name, location, and relevant details.";

