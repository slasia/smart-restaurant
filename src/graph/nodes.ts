import { chatModel } from "../models/openai";
import { restaurantSearch } from "../tools/serpTool";
import { State } from "../graph/state";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { RESTAURANT_PROMPT_TEMPLATE } from "../prompts/restaurantPrompt";
import { loadDocuments } from "../rag/loader";
import { splitDocuments } from "../rag/splitter";
import { createVectorStore } from "../rag/store";
import { createRAGAgent } from "../agents/ragAgent";

export async function llmNode(state: State): Promise<State> {
  const llmWithTools = chatModel.bindTools([restaurantSearch]);

  // If there are no messages or the array is empty, create the initial message
  const isFirstCall = !state.messages || state.messages.length === 0;
  const messages = isFirstCall
    ? [
        new HumanMessage({
          content: RESTAURANT_PROMPT_TEMPLATE(state.userQuery),
        }),
      ]
    : state.messages;

  console.log("\n🔵 [llmNode] ========================================");
  console.log(`🔵 [llmNode] Is first call: ${isFirstCall}`);
  console.log(`🔵 [llmNode] Message history: ${messages.length} messages`);

  if (!isFirstCall) {
    console.log(`🔵 [llmNode] Last message received:`, {
      type: messages[messages.length - 1]?.constructor.name,
      isToolMessage: messages[messages.length - 1] instanceof ToolMessage,
    });
  }

  const response = await llmWithTools.invoke(messages);

  const hasToolCalls = response.tool_calls && response.tool_calls.length > 0;
  console.log(`🔵 [llmNode] LLM response received`);
  console.log(`🔵 [llmNode] Has tool_calls?: ${hasToolCalls}`);

  if (hasToolCalls && response.tool_calls) {
    console.log(
      `🔵 [llmNode] Number of tool_calls: ${response.tool_calls.length}`
    );
    response.tool_calls.forEach((tc, idx) => {
      console.log(`🔵 [llmNode]   Tool call ${idx + 1}: ${tc.name}`);
      console.log(`🔵 [llmNode]   Args:`, JSON.stringify(tc.args, null, 2));
    });
    console.log(
      `🔵 [llmNode] → LLM wants to execute tools to get more information`
    );
  } else {
    const responsePreview =
      typeof response.content === "string"
        ? response.content.substring(0, 150)
        : JSON.stringify(response.content).substring(0, 150);
    console.log(`🔵 [llmNode] LLM response (preview): ${responsePreview}...`);
    console.log(
      `🔵 [llmNode] → LLM has enough information, generating final response`
    );
  }

  // Add LLM to history
  const updatedMessages = [...messages, new AIMessage(response)];

  return {
    ...state,
    messages: updatedMessages,
  };
}

export async function toolsNode(state: State): Promise<State> {
  const messages = state.messages || [];
  const lastMessage = messages[messages.length - 1];

  console.log("\n🟢 [toolsNode] ========================================");
  console.log(`🟢 [toolsNode] Executing tools...`);

  // Verify that the last message is from the LLM and has tool_calls
  if (
    !(lastMessage instanceof AIMessage) ||
    !lastMessage.tool_calls ||
    lastMessage.tool_calls.length === 0
  ) {
    console.log(`🟢 [toolsNode] ⚠️  No tool_calls to execute, returning state`);
    return state; // No tools to execute
  }

  console.log(
    `🟢 [toolsNode] Number of tools to execute: ${lastMessage.tool_calls.length}`
  );
  const toolMessages: ToolMessage[] = [];

  for (let idx = 0; idx < lastMessage.tool_calls.length; idx++) {
    const toolCall = lastMessage.tool_calls[idx];
    console.log(
      `\n🟢 [toolsNode] --- Executing tool ${idx + 1}/${lastMessage.tool_calls.length} ---`
    );
    console.log(`🟢 [toolsNode] Name: ${toolCall.name}`);
    console.log(`🟢 [toolsNode] ID: ${toolCall.id}`);
    console.log(
      `🟢 [toolsNode] Arguments:`,
      JSON.stringify(toolCall.args, null, 2)
    );

    try {
      let toolResult: string;

      if (toolCall.name === "restaurantSearch" || toolCall.name === "search") {
        const searchInput =
          toolCall.args.input || toolCall.args.query || toolCall.args;
        console.log(`🟢 [toolsNode] → Executing search with SerpAPI...`);
        console.log(`🟢 [toolsNode] Search query:`, searchInput);
        toolResult = await restaurantSearch.invoke(searchInput);
        const resultPreview =
          typeof toolResult === "string"
            ? toolResult.substring(0, 200)
            : JSON.stringify(toolResult).substring(0, 200);
        console.log(
          `🟢 [toolsNode] ✅ Result received (preview): ${resultPreview}...`
        );
        console.log(
          `🟢 [toolsNode] → This result will be sent back to the LLM for processing`
        );
      } else {
        console.log(`🟢 [toolsNode] ⚠️  Unknown tool: ${toolCall.name}`);
        toolResult = `Tool ${toolCall.name} not found`;
      }

      // Create tool message with the result
      toolMessages.push(
        new ToolMessage({
          content: toolResult,
          tool_call_id: toolCall.id || "",
        })
      );
    } catch (error) {
      console.error(`🟢 [toolsNode] ❌ Error executing tool:`, error);
      const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
      toolMessages.push(
        new ToolMessage({
          content: errorMessage,
          tool_call_id: toolCall.id || "",
        })
      );
    }
  }

  console.log(`\n🟢 [toolsNode] ✅ All tools executed`);
  console.log(
    `🟢 [toolsNode] → Results will be added to history and LLM will be called again`
  );
  console.log(
    `🟢 [toolsNode] → LLM will decide if it needs more information or can respond`
  );

  // Add results to history
  const updatedMessages = [...messages, ...toolMessages];

  return {
    ...state,
    messages: updatedMessages,
  };
}
export function shouldSearchInInternet(state: State): "internet" | "end" {
  console.log(`🟡 [shouldSearchInInternet] Checking RAG result...`);
  console.log(
    `🟡 [shouldSearchInInternet] cuisinePreferences: ${state.cuisinePreferences}`
  );

  if (state.cuisinePreferences === "false") {
    console.log(
      `🟡 [shouldSearchInInternet] → Not found in RAG, searching on internet`
    );
    return "internet";
  } else {
    console.log(`🟡 [shouldSearchInInternet] → Found in RAG, finalizing`);
    return "end";
  }
}
export function shouldExecuteTools(state: State): "tools" | "end" {
  const messages = state.messages || [];

  console.log(
    "\n🟡 [shouldExecuteTools] ========================================"
  );
  console.log(
    `🟡 [shouldExecuteTools] Evaluating whether to continue with tools or finalize...`
  );
  console.log(
    `🟡 [shouldExecuteTools] Total messages in history: ${messages.length}`
  );

  // If there are no messages, we cannot continue (this shouldn't happen, but for safety)
  if (messages.length === 0) {
    console.log(`🟡 [shouldExecuteTools] ⚠️  No messages, finalizing`);
    return "end";
  }

  const lastMessage = messages[messages.length - 1];
  console.log(`🟡 [shouldExecuteTools] Last message:`, {
    type: lastMessage.constructor.name,
    isAIMessage: lastMessage instanceof AIMessage,
    isToolMessage: lastMessage instanceof ToolMessage,
  });

  // If the last message is from the LLM and has tool_calls, we need to execute tools
  if (
    lastMessage instanceof AIMessage &&
    lastMessage.tool_calls &&
    lastMessage.tool_calls.length > 0
  ) {
    console.log(
      `🟡 [shouldExecuteTools] ✅ LLM wants to execute ${lastMessage.tool_calls.length} tool(s)`
    );
    console.log(
      `🟡 [shouldExecuteTools] → Decision: GO TO TOOLS (execute tools)`
    );
    console.log(
      `🟡 [shouldExecuteTools] → Reason: LLM needs more information before responding`
    );
    return "tools";
  }

  // If there are no tool_calls, the LLM has the final response
  if (lastMessage instanceof AIMessage) {
    console.log(`🟡 [shouldExecuteTools] ✅ LLM has no more tool_calls`);
    console.log(
      `🟡 [shouldExecuteTools] → Decision: FINALIZE (LLM has the final response)`
    );
    console.log(
      `🟡 [shouldExecuteTools] → Reason: LLM already has enough information to respond`
    );
  } else if (lastMessage instanceof ToolMessage) {
    console.log(`🟡 [shouldExecuteTools] ✅ Last message is a tool result`);
    console.log(
      `🟡 [shouldExecuteTools] → Decision: FINALIZE (waiting for LLM response in next iteration)`
    );
    console.log(
      `🟡 [shouldExecuteTools] → Note: This shouldn't happen, the LLM should have already responded`
    );
  }

  return "end";
}

export async function ragNode(state: State): Promise<State> {
  console.log("\n🟣 [ragNode] ========================================");
  console.log(`🟣 [ragNode] Initializing RAG system...`);

  // Initialize RAG components
  const docs = await loadDocuments();
  const allSplits = await splitDocuments(docs);
  const vectorStore = await createVectorStore(allSplits);
  const agent = await createRAGAgent(vectorStore);

  console.log(`🟣 [ragNode] RAG system initialized`);
  console.log(`🟣 [ragNode] Processing query: ${state.userQuery}`);

  console.log(`\n🟣 [ragNode] 🔍 Checking direct search in vector store...`);
  const directSearch = await vectorStore.similaritySearch(state.userQuery, 2);
  const hasDirectResults =
    directSearch.length > 0 &&
    directSearch.some(
      (doc) =>
        doc.pageContent.toLowerCase().includes("restaurant") ||
        doc.pageContent.toLowerCase().includes("tandil")
    );
  console.log(
    `🟣 [ragNode] 📊 Direct search results: ${directSearch.length} documents found`
  );
  console.log(
    `🟣 [ragNode] ${hasDirectResults ? "✅" : "❌"} Are there relevant results?: ${hasDirectResults}`
  );
  if (directSearch.length > 0) {
    console.log(
      `🟣 [ragNode] 📄 First result (preview): ${directSearch[0].pageContent.substring(0, 150)}...`
    );
  }

  // Execute RAG agent with user query
  const agentInputs = {
    messages: [{ role: "user", content: state.userQuery }],
  };

  const stream = await agent.stream(agentInputs, {
    streamMode: "values",
  });

  let ragResponse = "";
  for await (const step of stream) {
    const lastMessage = step.messages[step.messages.length - 1];
    const messageType = lastMessage.getType();
    const messageContent =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);
    // Capture the final response
    if (messageType === "ai" || messageType === "assistant") {
      ragResponse = messageContent;
    }
  }

  console.log(`\n🟣 [ragNode] ✅ RAG processing completed`);
  console.log(`🟣 [ragNode] Response: ${ragResponse.substring(0, 200)}...`);

  // Option 1: Analysis of RAG response
  console.log(`\n🟣 [ragNode] 🔍 Analyzing RAG response...`);
  const responseLower = ragResponse.toLowerCase();
  const hasNegativeIndicators =
    responseLower.includes("false") ||
    responseLower.includes("no encontré") ||
    responseLower.includes("no encontre") ||
    responseLower.includes("no hay") ||
    responseLower.includes("no existe") ||
    responseLower.trim().length < 10; // Very short responses are likely negative

  const hasPositiveIndicators =
    responseLower.includes("restaurant") ||
    responseLower.includes("restaurante") ||
    responseLower.includes("tandil") ||
    (ragResponse.length > 50 && !hasNegativeIndicators); // Long responses without negative indicators

  const foundRestaurant = !hasNegativeIndicators && hasPositiveIndicators;

  console.log(
    `🟣 [ragNode] 📊 Negative indicators found: ${hasNegativeIndicators}`
  );
  console.log(
    `🟣 [ragNode] 📊 Positive indicators found: ${hasPositiveIndicators}`
  );
  console.log(
    `🟣 [ragNode] ${foundRestaurant ? "✅" : "❌"} Restaurant found?: ${foundRestaurant}`
  );

  // Final summary
  const finalVerification = hasDirectResults && foundRestaurant;
  console.log(
    `\n🟣 [ragNode] 🎯 FINAL VERIFICATION: ${finalVerification ? "✅ RESTAURANT FOUND" : "❌ RESTAURANT NOT FOUND"}`
  );
  console.log(
    `🟣 [ragNode]   - Direct search: ${hasDirectResults ? "✅" : "❌"}`
  );
  console.log(
    `🟣 [ragNode]   - Response analysis: ${foundRestaurant ? "✅" : "❌"}`
  );

  // If restaurant not found, return "false" for later evaluation
  const finalResponse = finalVerification
    ? ragResponse || "No response from RAG"
    : "false";

  console.log(
    `🟣 [ragNode] 📤 Final response: ${finalResponse === "false" ? "false (not found)" : finalResponse.substring(0, 100) + "..."}`
  );

  return {
    ...state,
    cuisinePreferences: finalResponse,
  };
}

export async function finalizeNode(state: State): Promise<State> {
  const messages = state.messages || [];

  console.log("\n🔴 [finalizeNode] ========================================");
  console.log(`🔴 [finalizeNode] Extracting final response...`);
  console.log(`🔴 [finalizeNode] Total messages processed: ${messages.length}`);

  // If there's already a RAG response (and it's not "false"), use it directly
  if (
    state.cuisinePreferences &&
    state.cuisinePreferences !== "false" &&
    state.cuisinePreferences !== "No response from RAG"
  ) {
    console.log(`🔴 [finalizeNode] ✅ Using RAG response`);
    console.log(
      `🔴 [finalizeNode] Final response (preview): ${state.cuisinePreferences.substring(0, 200)}...`
    );
    console.log(`🔴 [finalizeNode] ✅ Process completed`);

    return {
      ...state,
      cuisinePreferences: state.cuisinePreferences,
    };
  }

  // If there's no RAG response, search in messages (normal LLM flow)
  let finalResponse = "";

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (
      message instanceof AIMessage &&
      (!message.tool_calls || message.tool_calls.length === 0)
    ) {
      finalResponse =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      console.log(
        `🔴 [finalizeNode] ✅ Final response found in message ${i + 1}/${messages.length}`
      );
      break;
    }
  }

  if (!finalResponse) {
    console.log(
      `🔴 [finalizeNode] ⚠️  Final response not found, using last message`
    );
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      finalResponse =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);
    }
  }

  const responsePreview = finalResponse.substring(0, 200);
  console.log(
    `🔴 [finalizeNode] Final response (preview): ${responsePreview}...`
  );
  console.log(`🔴 [finalizeNode] ✅ Process completed`);

  return {
    ...state,
    cuisinePreferences: finalResponse || "No response generated",
  };
}
