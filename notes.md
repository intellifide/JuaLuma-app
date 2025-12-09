### This file is for the user's reference only. do not use it for any development purposes.

npx --yes serve website_template -l 4173

# Switch to Dev branch (for development)
git checkout Dev

# Switch to main branch (for stable releases)
git checkout main

# Create a feature branch from Dev
git checkout Dev
git checkout -b feature/your-feature-name

# Merge Dev to main (when ready)
git checkout main
git merge Dev

# Push changes from Dev branch
git push origin Dev

# Switch to main and push stable releases
git checkout main
git merge Dev
git push origin main

# View repository on GitHub
gh repo view --web

**Last Updated:** December 07, 2025 at 08:39 PM


# TASK ASSIGNMENTS

review https://www.notion.so/Finity-app-2c22c5428b0880a9b6c7d265d452f79e?v=ec7b8e3634a34645b86e977f56f506e2&source=copy_link  using the notion mcp server. the focus is on the page titled "Local Development Tasks Part 2". your task is to review, execute, and iterate the tasks I outline below. If I mention a task that has already be labeled complete do not move forward and make it know to me. mark the task in progress when you start it. mark it complete when you finish.

