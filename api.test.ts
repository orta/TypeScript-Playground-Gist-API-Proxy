import { contentToCodePlusCompilerSettings, filesToStoryPages, get } from "./API/index";
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
    "display": "There are no files in gist: 1234",
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

describe("playground stories", () => {
  it("it bails when it already", async () => {
    const res = await runTest({ query: { gistID: "1234" } }, {}, (mockAPI) => {
      const files = {
        "1~Intro.md": {
          filename: "1~Intro.md",
          content: "## welcome",
        },
      };
      mockAPI.gists.get.mockResolvedValueOnce({ status: 200, data: { files } });
    });

    expect(res).toMatchInlineSnapshot(`
{
  "body": {
    "display": "Cannot render 1~Intro.md in the playground as it's not code",
    "error": true,
  },
  "code": 404,
}
`);
  });
});

describe(contentToCodePlusCompilerSettings, () => {
  it("gives an empty compiler opts", () => {
    expect(contentToCodePlusCompilerSettings("ts", "const a = 123")).toMatchInlineSnapshot(`
{
  "code": "const a = 123",
  "compilerOptions": "",
}
`);
  });

  it("re-uses the format from the typescript website", () => {
    expect(contentToCodePlusCompilerSettings("ts", "//// { compiler: { strictFunctionTypes: false } }\nconst a = 123"))
      .toMatchInlineSnapshot(`
{
  "code": "const a = 123",
  "compilerOptions": "strictFunctionTypes=false",
}
`);
  });

  it("adds the JS settings to the params", () => {
    expect(contentToCodePlusCompilerSettings("js", "const a = 123").compilerOptions).toMatchInlineSnapshot(`"filetype=js"`);
  });
});

const f = (files: any): any => {
  const gist: any = {};
  Object.keys(files).forEach((f) => {
    gist[f] = {
      filename: f,
      content: files[f],
    };
  });
  return gist;
};

const noOpMDToHTML = async () => " ";
const mdToHTML = async (md) => `html version of ${md}`;

describe(filesToStoryPages, () => {
  it("bails when a filename does not start with a number and ~", async () => {
    const files = {
      "abc.ts": "// code",
    };
    const res = await filesToStoryPages(f(files), noOpMDToHTML);
    expect(res).toMatchInlineSnapshot(`
{
  "display": "The file 'abc.ts' does not start with an index and ~ - e.g. '1~'",
  "error": true,
}
`);
  });

  it("maps code correctly", async () => {
    const files = {
      "0 ~ abc.ts": "// code",
    };
    const res = await filesToStoryPages(f(files), noOpMDToHTML);
    expect(res).toMatchInlineSnapshot(`
[
  {
    "code": "// code",
    "params": "",
    "title": "abc.ts",
    "type": "code",
  },
]
`);
  });

  it("maps md correctly", async () => {
    const files = {
      "0 ~ abc.md": "## Markdown",
    };
    const res = await filesToStoryPages(f(files), mdToHTML);
    expect(res).toMatchInlineSnapshot(`
[
  {
    "html": "html version of ## Markdown",
    "title": "abc.md",
    "type": "html",
  },
]
`);
  });

  it("fills gaps in with HR", async () => {
    const files = {
      "0 ~ abc.ts": "// code",
      "1 ~ file.md": "/* md */",
      "3 ~ abc2.ts": "// code",
    };
    const res = await filesToStoryPages(f(files), mdToHTML);
    expect(res).toMatchInlineSnapshot(`
[
  {
    "code": "// code",
    "params": "",
    "title": "abc.ts",
    "type": "code",
  },
  {
    "html": "html version of /* md */",
    "title": "file.md",
    "type": "html",
  },
  {
    "type": "hr",
  },
  {
    "code": "// code",
    "params": "",
    "title": "abc2.ts",
    "type": "code",
  },
]
`);
  });
});
