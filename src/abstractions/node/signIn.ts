import { env, window } from "vscode";

export async function performSignInFlow(): Promise<string | undefined> {
  const value = await env.clipboard.readText();
  const token = await window.showInputBox({
    prompt: "Enter your GitHub token",
    value
  });

  return token;
}
