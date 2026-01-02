import "dotenv/config";
import { StateGraph, START, END } from "@langchain/langgraph";
import { StateAnnotation } from "./type";
import { llmNode, toolsNode, shouldContinue, finalizeNode } from "../agents/cuisineAgent";
import { EXAMPLE_INITIAL_STATE } from "../inputs/exampleInput";

const graph = new StateGraph(StateAnnotation)
  // Node that calls the LLM
  .addNode("llm", llmNode)
  // Node that executes tools
  .addNode("tools", toolsNode)
  // Final node that extracts the response
  .addNode("finalize", finalizeNode)
  // Initial flow: START -> LLM
  .addEdge(START, "llm")
  // Conditional decision: after LLM, decide whether to go to tools or finalize
  .addConditionalEdges("llm", shouldContinue, {
    tools: "tools",    // If there are tool_calls → go to tools
    end: "finalize",   // If there are no tool_calls → finalize
  })
  // After executing tools, return to LLM to process results
  .addEdge("tools", "llm")  // ← This is the key: returns to LLM
  // Finalize the graph
  .addEdge("finalize", END)
  .compile();

// Execute the graph with the example input
const result = await graph.invoke(EXAMPLE_INITIAL_STATE);
console.log(result.cuisinePreferences);