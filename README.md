# Vibes Commit It

Generate clean, conventional Git commit messages using Perplexity AI.

## Features

- Automatically generates commit messages from staged `git diff`
- Uses Perplexity's `sonar-pro` model
- Integrates directly into VS Code SCM

## Setup

1. Install the extension (`.vsix`)
2. Open VS Code Settings and set:

```json
"vibesCommitIt.apiKey": "your-perplexity-api-key"
````

3. Stage your Git changes
4. Run `Generate AI Commit Message` from the Command Palette

## Requirements

* Internet access (calls the Perplexity API)
* Perplexity API Key

---

© 2025 Vaibhav Kulkarni
