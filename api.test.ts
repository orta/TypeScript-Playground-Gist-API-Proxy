import { get } from "./API/index";
import { createMockGitHubClient } from "./utils/createMockGitHubAPI";

describe(get, () => {
  it("NOOPs when there's no query", async () => {
    const { api } = createMockGitHubClient();
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

  it("bails when asking for a gist returns a 404", async () => {
    const { mockAPI, api } = createMockGitHubClient();
    const req = { query: { gistID: "1234" } } as any;
    const ctx = {} as any;
    mockAPI.gists.get.mockResolvedValueOnce({ status: 404 });
    await get(api, ctx, req);

    expect(ctx.res).toMatchInlineSnapshot(`
{
  "body": {
    "display": "Could not find gist with ID 1234",
    "error": true,
  },
  "code": 404,
}
`);
  });
});
