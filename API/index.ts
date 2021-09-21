import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { Octokit } from "@octokit/rest";
import { createGitHubClient } from "./createGitHubClient";
import type { Endpoints } from "@octokit/types/dist-types/generated/endpoints";

export type GistFiles = Endpoints["GET /gists/{gist_id}"]["response"]["data"]["files"];

export const run: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  const api = createGitHubClient();
  if (req.method === "GET") {
    await get(api, context, req);
  } else if (req.method === "POST") {
    await post(api, context, req);
  }
};

type StoryContent =
  | { type: "html"; html: string; title: string }
  | { type: "code"; code: string; params: any; title: string }
  | { type: "hr" };

type Success =
  | {
      type: "code";
      code: string;
      params: string;
    }
  | {
      type: "story";
      title: string;
      files: Array<StoryContent>;
    };

type APIResponse = Success | { error: true; display: string };

// Allow all others to access this JSON, we can
// tighten this down to just the TS URLs if the route is abused, but it is
// just proxying gist data, so it's not too important.
const headers = {
  "Content-Type": "text/json",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Origin": "*",
};

const createResponse = (context: Context) => (code: number, response: APIResponse) => {
  context.res = {
    code,
    headers,
    body: response,
  };
};

// Grabs the gist, if it contains  1 file then we validate that is code and return that
//                 if it contains <1 files, then we call it a 'story' and support a file browser and renderer HTML + code
export const get = async function (api: Octokit, context: Context, req: HttpRequest): Promise<void> {
  const res = createResponse(context);
  const gistID = req.query["gistID"];
  // Gist IDs are global, so any gist is legit
  if (!gistID) return res(401, { error: true, display: "Request for gist did not include an ID " });

  const gist = await api.gists.get({ gist_id: gistID });
  if (gist.status !== 200) return res(gist.status, { error: true, display: `Could not find gist with ID ${gistID}` });

  const files = Object.keys(gist.data.files);
  if (files.length === 0) return res(404, { error: true, display: `There are no files in gist: ${gistID}` });

  if (files.length === 1) {
    // We're a single file example
    const file = gist.data.files[files[0]];
    if (!canShowAsCode(file.filename))
      return res(404, { error: true, display: `Cannot render ${file.filename} in the playground as it's not code` });
    return res(200, { type: "code", code: file.content, params: "" });
  } else {
    const files = await filesToStoryPages(gist.data.files, mdToHTML(api));
    const title = gist.data.description;
    if ("error" in files) {
      return res(400, files);
    } else {
      return res(200, { type: "story", files, title });
    }
  }
};

type NewPostLink = { state: "success"; id: string; user: string; jwt: string };

export const post = async function (api: Octokit, context: Context, req: HttpRequest): Promise<void> {
  // For posting
};

export const canShowAsCode = (filename: string) => {
  const filetype = filename.split(".").pop();
  const known = ["ts", "js", "jsx", "tsx", "mjs", "cjs"];
  return known.indexOf(filetype) !== -1;
};

export const contentToCodePlusCompilerSettings = (extension: string, contents: string) => {
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
  if (extension.startsWith("j")) {
    compiler["filetype"] = "js";
  }

  return {
    code: contents,
    compilerOptions: compiler,
  };
};

const mdToHTML =
  (api: Octokit) =>
  async (md: string): Promise<string | null> => {
    const req = await api.markdown.render({ text: md });
    if (req.status === 200) {
      return req.data;
    }
    return null;
  };

type MDToHTML = (md: string) => Promise<string | null>;

// Convert the main 'gist' files object to something which the client can understand
export const filesToStoryPages = async (
  files: GistFiles,
  mdToHTML: MDToHTML
): Promise<StoryContent[] | { error: true; display: string }> => {
  const items: StoryContent[] = [];

  const keys = Object.keys(files).sort();
  for (const key of keys) {
    if (!key.includes("~")) return { error: true, display: `The file '${key}' does not start with an index and ~ - e.g. '1~'` };
    const [indexStr, filename] = key.split("~");
    const index = Number(indexStr);

    if (!isFinite(index)) return { error: true, display: `The file '${key}' does not start with a number before the '~'` };

    const content = files[key].content;
    if (!content) return { error: true, display: `The file '${key}' is empty` };

    const ext = filename.split(".").pop();
    if (canShowAsCode(ext)) {
      const preparse = contentToCodePlusCompilerSettings(ext, content);
      items[index] = { type: "code", code: preparse.code, params: preparse.compilerOptions, title: filename.split("~")[0].trim() };
    } else if (ext === "md") {
      const html = await mdToHTML(content);
      if (!html) return { error: true, display: `The markdown for '${key}' could not be rendered by the GitHub Markdown API` };

      items[index] = { type: "html", html, title: filename.split("~")[0].trim() };
    } else {
      return {
        error: true,
        display: `Can't do anything with the file '${key}'. It needs to be a markdown file, or something the playground supports`,
      };
    }
  }

  // Fill in the gaps
  for (let index = 0; index < items.length; index++) {
    const element = items[index];
    if (!element) items[index] = { type: "hr" };
  }

  return items;
};
