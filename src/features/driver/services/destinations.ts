import { searchDestinations, type SearchDestination } from '../discovery';

export function searchDestinationSuggestions(
  query: string,
): Promise<SearchDestination[]> {
  return Promise.resolve(searchDestinations(query));
}
