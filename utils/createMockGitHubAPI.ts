import { Octokit } from "@octokit/rest";

/**
 * Creates a version of the GitHub API client where API calls
 * are fully mocked out and you have total control over the response APIs. This
 * object should always contain a jest.fn for every API call the app makes
 * over time.
 *
 * @example
 *
 *   const mockAPI = createMockGitHubClient();
 *   mockAPI.repos.checkCollaborator.mockResolvedValue({ data: { permission: "write" } });
 *   mockAPI.issues.addAssignees.mockResolvedValue({});
 *
 *   // Then run it through convertToOctokitAPI to use in functions
 *
 *   const api = convertToOctokitAPI(mockAPI)
 */
export const createMockGitHubClient = () => {
  const mockAPI = {
    gists: {
      get: jest.fn(),
    },
  };
  return {
    mockAPI,
    api: convertToOctokitAPI(mockAPI),
  };
};

// Converts any jest.fn in the above function into a Promise to ensure
// that these two functions are kept in sync

type JestMockToPromise<Type> = {
  [Property in keyof Type]: { [SubProperty in keyof Type[Property]]: Promise<any> };
};

export type MockAPI = ReturnType<typeof createMockGitHubClient>["mockAPI"];

// Hardcoding mapped types like this makes it easy to see the results in the hover
export type PromisifiedInferredJestObj = JestMockToPromise<MockAPI>;

/**
 * A Fake GitHub client which lets you work with fake responses while working in development
 */
export const createFakeGitHubClient = () => {
  const fake: PromisifiedInferredJestObj = {
    gists: {
      get: Promise.resolve({}),
    },
  };

  return fake as unknown as Octokit;
};

/**
 * Assertion functions don't work when the param type is inferred,
 * so it's either set a variable like this in each test, or we hardcode
 * the return type for createMockGitHubClient. I think this is probably
 * the better option.
 */
export const convertToOctokitAPI = (mock: {}) => {
  return mock as unknown as Octokit;
};
