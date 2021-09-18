import { contentToCodePlusCompilerSettings, get } from "./API/index";
import { createMockGitHubClient } from "./utils/createMockGitHubAPI";

const runTest = async (req: any, ctx: any, mock: (api: import("./utils/createMockGitHubAPI").MockAPI) => void) => {
  const { api, mockAPI } = createMockGitHubClient();
  mock(mockAPI);
  await get(api, ctx, req);
  return ctx.res;
};

describe(get, () => {
  it("NOOPs when there's no query", async () => {
    const res = await runTest({ query: {} }, {}, (mock) => {
      /* noop */
    });

    expect(res).toMatchInlineSnapshot(`
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
    const res = await runTest({ query: { gistID: "1234" } }, {}, (mockAPI) => {
      mockAPI.gists.get.mockResolvedValueOnce({ status: 404 });
    });

    expect(res).toMatchInlineSnapshot(`
{
  "body": {
    "display": "Could not find gist with ID 1234",
    "error": true,
  },
  "code": 404,
}
`);
  });

  it("NOOPs when we get weird data", async () => {
    const res = await runTest({ query: { gistID: "1234" } }, {}, (mockAPI) => {
      mockAPI.gists.get.mockResolvedValueOnce({ status: 200, data: { files: {} } });
    });

    expect(res).toMatchInlineSnapshot(`
{
  "body": {
    "display": "There were no files in gist: 1234",
    "error": true,
  },
  "code": 404,
}
`);
  });

  it("handles a gist which is not code", async () => {
    const res = await runTest({ query: { gistID: "1234" } }, {}, (mockAPI) => {
      const files = {
        "file.md": {
          filename: "file.md",
          content: "OK",
        },
      };
      mockAPI.gists.get.mockResolvedValueOnce({ status: 200, data: { files } });
    });

    expect(res).toMatchInlineSnapshot(`
{
  "body": {
    "display": "Cannot render file.md in the playground as it's not code",
    "error": true,
  },
  "code": 404,
}
`);
  });

  it("does it for a single code file", async () => {
    const res = await runTest({ query: { gistID: "1234" } }, {}, (mockAPI) => {
      const files = {
        "file.ts": {
          filename: "file.ts",
          content: "const a = 123",
        },
      };
      mockAPI.gists.get.mockResolvedValueOnce({ status: 200, data: { files } });
    });

    expect(res).toMatchInlineSnapshot(`
{
  "body": {
    "code": "const a = 123",
    "params": "",
    "type": "code",
  },
  "code": 200,
}
`);
  });
});

describe(contentToCodePlusCompilerSettings, () => {
  it("gives an empty compiler opts", () => {
    expect(contentToCodePlusCompilerSettings("const a = 123")).toMatchInlineSnapshot(`
{
  "code": "const a = 123",
  "compilerOptions": {},
}
`);
  });

  it("re-uses the format from the typescript website", () => {
    expect(contentToCodePlusCompilerSettings("//// { compiler: { strictFunctionTypes: false } }\nconst a = 123")).toMatchInlineSnapshot(`
{
  "code": "const a = 123",
  "compilerOptions": {
    "strictFunctionTypes": false,
  },
}
`);
  });
});
