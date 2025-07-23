import * as vscode from "vscode";
import { exec } from "child_process";
import { post } from "axios";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Get the currently opened workspace's root directory.
 */
function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Retrieve staged Git changes (diff).
 */
async function getStagedDiff(cwd: string): Promise<string> {
  try {
    const { stdout } = await execAsync("git diff --staged", { cwd });
    return stdout;
  } catch {
    throw new Error("No staged changes found.");
  }
}

/**
 * Request commit message generation from Perplexity API.
 */
async function generateCommitMessage(
  diff: string,
  apiKey: string
): Promise<string> {
  const response = await post(
    "https://api.perplexity.ai/chat/completions",
    {
      model: "sonar-pro",
      messages: [
        {
          role: "user",
          content: `
            You're an experienced developer. Write a clean, concise, conventional commit message 
            summarizing the following staged Git diff. Focus on what changed and why. 
            Avoid file names or line counts.
            Diff:
            ${diff}
          `,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Sets the commit message in the SCM input box.
 */
function setSCMCommitMessage(message: string): boolean {
  const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
  const api = gitExtension?.getAPI(1);
  const repo = api?.repositories?.[0];

  if (repo) {
    repo.inputBox.value = message;
    vscode.commands.executeCommand("workbench.view.scm");
    return true;
  }

  return false;
}

/**
 * Prompt user to confirm or edit the commit message and then commit.
 */
async function promptAndCommit(message: string, cwd: string) {
  const finalMsg = await vscode.window.showInputBox({
    value: message,
    prompt: "Edit and confirm commit message",
  });

  if (finalMsg) {
    await execAsync(`git commit -m "${finalMsg}"`, { cwd });
  }
}

/**
 * Main command to generate and apply commit message.
 */
async function handleGenerateCommit() {
  const cwd = getWorkspaceRoot();

  if (!cwd) {
    vscode.window.showErrorMessage("No workspace folder is open.");
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    vscode.window.showErrorMessage(
      "API Key not set. Please configure 'vibesCommitIt.apiKey' in your settings."
    );
    return;
  }

  try {
    const diff = await getStagedDiff(cwd);
    const commitMessage = await generateCommitMessage(diff, apiKey);

    const isSet = setSCMCommitMessage(commitMessage);
    if (!isSet) {
      await promptAndCommit(commitMessage, cwd);
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      error.message || "Failed to generate commit message."
    );
  }
}

/**
 * Register the VS Code command.
 */
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "vibes-commit-it.generate",
    handleGenerateCommit
  );
  context.subscriptions.push(disposable);
}

function getApiKey(): string | undefined {
  return vscode.workspace
    .getConfiguration()
    .get<string>("vibesCommitIt.apiKey");
}
