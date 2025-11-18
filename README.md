# Smart Restaurant

Smart restaurant project using LangChain and search tools.

## Requirements

- Node.js 18+ 
- npm or yarn

## Installation

```bash
npm install
```

## Configuration

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables in the `.env` file:
   - `SERPAPI_API_KEY`: Your SerpAPI API key
   - `OPENAI_API_KEY`: Your OpenAI API key

## Scripts

- `npm run build`: Compiles the TypeScript project
- `npm run lint`: Runs ESLint
- `npm run lint:fix`: Automatically fixes linting errors
- `npm run format`: Formats code with Prettier
- `npm run type-check`: Type checks without compiling

## Project Structure

```
src/
  tools/
    serpTool.ts    # SerpAPI search tool
```

## Technologies

- TypeScript
- LangChain
- SerpAPI

