import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const StateAnnotation = Annotation.Root({
  userQuery: Annotation<string>,
  cuisinePreferences: Annotation<string>,
  messages: Annotation<BaseMessage[]>,
});

export type State = typeof StateAnnotation.State;
