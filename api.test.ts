import { get } from "./API/index";
import { createMockGitHubClient } from "./utils/createMockGitHubAPI";

describe(get, () => {
  it("NOOPs when there's no query", async () => {
    const { mockAPI, api } = createMockGitHubClient();
    const req = { query: {} } as any;
    const ctx = {} as any;
    await get(api, ctx, req);

    expect(ctx.res).toMatchInlineSnapshot(`
    {
      "body": {
        "display": "Request for gist did not include an ID ",
        "error": true,
      },
      "code": 401,
    }
    `);
  });
});
