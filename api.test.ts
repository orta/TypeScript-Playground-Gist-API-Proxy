import {get} from "./API/index"
import { createMockGitHubClient } from "./utils/createMockGitHubAPI";

it("KO", () => {
    const mockAPI = createMockGitHubClient();
    // mockAPI.repos.checkCollaborator.mockResolvedValue({ data: { permission: "write" } });
    // mockAPI.issues.addAssignees.mockResolvedValue({});
    
})