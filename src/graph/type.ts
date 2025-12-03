import { Annotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
  userQuery: Annotation<string>,
  cuisinePreferences: Annotation<string>,
});
