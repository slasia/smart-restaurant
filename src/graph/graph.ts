import "dotenv/config";
import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "./type";
import { cuisineAgentNode } from "../agents/cuisineAgent";

const graph = new StateGraph(StateAnnotation)
  .addNode("mock_llm", cuisineAgentNode)
  .addEdge(START, "mock_llm")
  .addEdge("mock_llm", END)
  .compile();

const result = await graph.invoke({
  userQuery:
    "Quiero ver una partido de futbol mientras como un un asado en Mar del Plata",
});
console.log(result);
