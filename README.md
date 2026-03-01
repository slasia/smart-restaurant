# Smart Restaurant

An intelligent restaurant recommendation system that combines **RAG (Retrieval-Augmented Generation)** with internet search capabilities to find restaurants based on user preferences. The system first searches a local database of restaurants in Tandil, and if no results are found, performs internet searches using SerpAPI.

## Table of Contents

- [Architecture](#architecture)
- [Workflow](#workflow)
- [State Graph Structure](#state-graph-structure)
- [Components](#components)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technical Details](#technical-details)
- [Scripts](#scripts)

## Architecture

The system is built using **LangGraph** to create a state graph that manages the workflow. The graph consists of multiple nodes that process user queries through different stages:

```
START
  ↓
[RAG Node] → Checks if restaurant found in local database
  ↓
[Decision Function] → Restaurant found?
  ├─ YES → [Finalize Node] → END
  └─ NO → [LLM Node] → [Tools Node] → [LLM Node] → [Finalize Node] → END
```

### Graph Nodes

1. **RAG Node** (`ragNode`): Searches restaurants in the local database using vector similarity search
2. **LLM Node** (`llmNode`): Processes queries and decides whether to use tools
3. **Tools Node** (`toolsNode`): Executes internet searches using SerpAPI
4. **Finalize Node** (`finalizeNode`): Extracts and returns the final response

### Decision Functions

- **`shouldSearchInInternet`**: Evaluates RAG results and decides whether to search the internet
- **`shouldContinue`**: Determines if the LLM needs to execute tools or can finalize

## Workflow

### Flow 1: RAG Finds Restaurant

1. User sends a query (e.g., "I want to eat pasta in Tandil")
2. **RAG Node**:
   - Loads and processes the restaurants CSV file
   - Creates embeddings and vector store using OpenAI `text-embedding-3-large`
   - Performs similarity search for relevant restaurants
   - Verifies results using dual verification:
     - Direct search in vector store
     - Response analysis from RAG agent
   - If found: returns RAG response
   - If not found: returns `"false"`
3. **shouldSearchInInternet** evaluates the result:
   - If `"false"` → routes to `llmNode` (search internet)
   - If has response → routes to `finalizeNode` (finalize)
4. **Finalize Node** returns the RAG response

### Flow 2: RAG Not Found, Internet Search

1. **RAG Node** returns `"false"`
2. **shouldSearchInInternet** → `"internet"`
3. **LLM Node**:
   - Receives user query
   - Decides if internet search is needed
   - If needed: generates tool calls for `restaurantSearch`
4. **Tools Node**:
   - Executes search with SerpAPI
   - Returns search results
5. **LLM Node** (second call):
   - Processes search results
   - Generates final response
6. **Finalize Node** extracts and returns the response

## State Graph Structure

The state graph is defined in `src/graph/graph.ts`:

```typescript
StateGraph(StateAnnotation)
  .addNode("rag", ragNode)
  .addNode("llm", llmNode)
  .addNode("tools", toolsNode)
  .addNode("finalize", finalizeNode)
  .addEdge(START, "rag")
  .addConditionalEdges("rag", shouldSearchInInternet, {
    internet: "llm",
    end: "finalize",
  })
  .addConditionalEdges("llm", shouldContinue, {
    tools: "tools",
    end: "finalize",
  })
  .addEdge("tools", "llm")
  .addEdge("finalize", END)
```

### State Definition

The state is defined in `src/graph/type.ts`:

```typescript
{
  userQuery: string;           // User's query
  cuisinePreferences: string;  // Found preferences/response
  messages: BaseMessage[];     // LLM message history
}
```

## Components

### RAG System (`src/RAG/`)

The RAG system implements retrieval-augmented generation for local database search:

- **`loader.ts`**: Loads the restaurants CSV file using `CSVLoader`
- **`splitter.ts`**: Splits documents into chunks (1000 chars, 200 overlap) using `RecursiveCharacterTextSplitter`
- **`store.ts`**: Creates and manages `MemoryVectorStore` with OpenAI embeddings
- **`ragAgent.ts`**: Creates a LangChain agent with a retrieval tool

### Agents (`src/agents/`)

- **`cuisineAgent.ts`**: Contains all graph nodes and decision functions:
  - `ragNode`: Searches local database with dual verification
  - `llmNode`: Processes queries with OpenAI model (`gpt-4o-mini`)
  - `toolsNode`: Executes SerpAPI searches
  - `finalizeNode`: Extracts final response (checks RAG first, then messages)
  - `shouldSearchInInternet`: Decision function after RAG
  - `shouldContinue`: Decision function after LLM

- **`ragAgent.ts`**: Creates RAG agent with retrieval tool using `createAgent` from LangChain

### Graph (`src/graph/`)

- **`graph.ts`**: Defines the LangGraph structure with nodes and edges
- **`type.ts`**: Defines the `State` type using LangGraph annotations

### Tools (`src/tools/`)

- **`serpTool.ts`**: SerpAPI tool wrapper for internet searches

### LLMs (`src/llms/`)

- **`openIA.ts`**: OpenAI model configuration (`ChatOpenAI` with `gpt-4o-mini`)

### Prompts (`src/prompts/`)

- **`cuisinePrompt.ts`**: Prompt template for LLM that instructs to search using SerpAPI and format output in Markdown

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API Key
- SerpAPI API Key

### Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd smart-restaurant
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
OPENAI_API_KEY=your_openai_api_key
SERPAPI_API_KEY=your_serpapi_key
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY`: Required for LLM model (`gpt-4o-mini`) and embeddings (`text-embedding-3-large`)
- `SERPAPI_API_KEY`: Required for internet searches

### Model Configuration

- **LLM Model**: `gpt-4o-mini` (configured in `src/llms/openIA.ts`)
- **Embedding Model**: `text-embedding-3-large` (configured in `src/RAG/store.ts`)
- **RAG Agent Model**: `gpt-5` (configured in `src/agents/ragAgent.ts`)

### Document Processing

- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Similarity Search**: Top 2 documents

## Usage

### Development

Run in development mode:
```bash
npm run dev
```

### Production

Build and run:
```bash
npm run build
npm start
```

### Custom Input

Modify `src/inputs/exampleInput.ts`:

```typescript
export const EXAMPLE_USER_QUERY = "Your query here";
```

## Project Structure

```
smart-restaurant/
├── src/
│   ├── agents/
│   │   ├── cuisineAgent.ts      # Graph nodes and decision functions
│   │   └── ragAgent.ts          # RAG agent creation
│   ├── graph/
│   │   ├── graph.ts             # LangGraph configuration
│   │   └── type.ts              # State type definition
│   ├── inputs/
│   │   └── exampleInput.ts     # Example input state
│   ├── llms/
│   │   └── openIA.ts           # OpenAI model configuration
│   ├── prompts/
│   │   └── cuisinePrompt.ts     # LLM prompt template
│   ├── RAG/
│   │   ├── document/
│   │   │   └── restaurants.csv  # Local restaurant database
│   │   ├── loader.ts            # CSV document loader
│   │   ├── splitter.ts          # Document chunking
│   │   └── store.ts             # Vector store creation
│   └── tools/
│       └── serpTool.ts          # SerpAPI tool wrapper
├── dist/                        # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Technical Details

### Dual Verification System

The RAG node implements a dual verification system to determine if a restaurant was found:

1. **Direct Search Verification**: Checks if relevant documents exist in the vector store
2. **Response Analysis**: Analyzes the RAG agent response for:
   - Negative indicators: "false", "no encontré", "no hay", "no existe", or very short responses
   - Positive indicators: "restaurant", "restaurante", "tandil", or long responses without negatives

If both verifications are positive, the restaurant is considered found. Otherwise, returns `"false"` to trigger internet search.

### Message Flow

- **RAG Path**: `userQuery` → RAG → `cuisinePreferences` → Finalize
- **Internet Path**: `userQuery` → RAG → `"false"` → LLM → Tools → LLM → Messages → Finalize

### Finalize Node Logic

The finalize node checks in this order:
1. If `cuisinePreferences` exists and is not `"false"` → use RAG response
2. Otherwise, search in `messages` for the last AI message without tool calls
3. Fallback to last message if no AI message found

### Logging System

The system uses emoji-prefixed logs for easy identification:
- 🟣 **RAG Node**: RAG system processing
- 🔵 **LLM Node**: Language model processing
- 🟢 **Tools Node**: Tool execution
- 🟡 **Decision Functions**: Routing decisions
- 🔴 **Finalize Node**: Response extraction

## Scripts

```bash
# Development
npm run dev              # Run with tsx (no compilation)

# Build
npm run build            # Compile TypeScript to JavaScript
npm start                # Build and run

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting errors automatically
npm run format           # Format code with Prettier
npm run format:check     # Check formatting without modifying
npm run type-check       # Type check without compilation
```

## Technologies

- **[LangChain](https://js.langchain.com/)**: LLM application framework
- **[LangGraph](https://js.langchain.com/docs/langgraph)**: State graph orchestration
- **[OpenAI](https://openai.com/)**: LLM (`gpt-4o-mini`) and embeddings (`text-embedding-3-large`)
- **[SerpAPI](https://serpapi.com/)**: Internet search API
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe JavaScript
- **[Zod](https://zod.dev/)**: Schema validation
- **[dotenv](https://github.com/motdotla/dotenv)**: Environment variable management

## License

ISC
