import { AzureFunction, Context, HttpRequest } from "@azure/functions"
import { Octokit } from "@octokit/rest";



const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {\
    context.log('HTTP trigger function processed a request.');
    const name = (req.query.name || (req.body && req.body.name));
    const responseMessage = name
        ? "Hello, " + name + ". This HTTP triggered function executed successfully."
        : "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.";

    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseMessage
    };
};

type Success = { 
    type: "code"
    code: string
} | {
    type: "story"
    files: Array<{ type: "html", html: string } | {type: "code", code: string, params: string }>
}

type APIResponse = Success | { error: true, display: string }

const get: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    if()
    const api = new Octokit()
    const r = await api.gists.get()

}

const post: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {




export default httpTrigger;