import { openAIModel } from "../llms/openIA";

export async function cuisineAgentNode(
  state: StateAnnotation.State
): Promise<StateAnnotation.State> {
  const response = await openAIModel.invoke(
    ` En base a las preferencias del usuario sugeri tipo de cocinas, preferencias del usuario: ${state.userQuery}`
  );
  console.log(response.content);
  return {
    userQuery: state.userQuery,
    cuisucuisinePreferences: response.content,
  }
}
