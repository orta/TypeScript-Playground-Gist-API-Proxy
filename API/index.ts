import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Octokit } from "@octokit/rest";
import { createGitHubClient } from "./createGitHubClient";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const api = createGitHubClient();
  if (req.method === "GET") {
    await get(api, context, req);
  } else if (req.method === "POST") {
    await post(api, context, req);
  }
};

type StoryContent =
  | { type: "html"; html: string; title: string }
  | { type: "code"; code: string; params: string; title: string }
  | { type: "hr" };

type Success =
  | {
      type: "code";
      code: string;
      params: string;
    }
  | {
      type: "story";
      files: Array<StoryContent>;
    };

type APIResponse = Success | { error: true; display: string };

const createResponse = (context: Context) => (code: number, response: APIResponse) => {
  context.res = {
    code,
    body: response,
  };
};

export const get = async function (api: Octokit, context: Context, req: HttpRequest): Promise<void> {
  const res = createResponse(context);

  const gistID = req.query["gistID"];
  // Gist IDs are global, so any gist is legit
  if (!gistID) return res(401, { error: true, display: "Request for gist did not include an ID " });

  const gist = await api.gists.get({ gist_id: gistID });
  if (gist.status !== 200) return res(gist.status, { error: true, display: `Could not find gist with ID ${gistID}` });

  const files = Object.keys(gist.data.files);
  if (files.length === 0) return res(404, { error: true, display: `There were no files in gist: ${gistID}` });

  if (files.length === 1) {
    // We're a single file example
    const file = gist.data.files[files[0]];
    if (!canShowAsCode(file.filename))
      return res(404, { error: true, display: `Cannot render ${file.filename} in the playground as it's not code` });
    return res(200, { type: "code", code: file.content, params: "" });
  } else {
    // WIP
    const file = gist.data.files[files[0]];
    return res(200, { type: "story", files: [] });
  }
};

type NewPostLink = { state: "success"; id: string; user: string; jwt: string };

export const post = async function (api: Octokit, context: Context, req: HttpRequest): Promise<void> {
  // For new one,
};

export const canShowAsCode = (filename: string) => {
  const filetype = filename.split(".").pop();
  const known = ["ts", "js", "jsx", "tsx", "mjs", "cjs"];
  return known.indexOf(filetype) !== -1;
};

export const contentToCodePlusCompilerSettings = (contents: string) => {
  let compiler = {};
  if (contents.startsWith("//// {")) {
    // convert windows newlines to linux new lines
    const preJSON = contents.replace(/\r\n/g, "\n").split("//// {")[1].split("}\n")[0];
    contents = contents.split("\n").slice(1).join("\n");

    const code = "({" + preJSON + "})";

    try {
      const obj = eval(code);
      compiler = obj.compiler;
    } catch (err) {
      return null;
    }
  }
  return {
    code: contents,
    compilerOptions: compiler,
  };
};

export default httpTrigger;
