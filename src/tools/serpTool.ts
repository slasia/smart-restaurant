import { SerpAPI } from "@langchain/community/tools/serpapi";

export const restaurantSearch = new SerpAPI(process.env.SERPAPI_API_KEY!);
