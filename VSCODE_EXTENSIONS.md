# 🔧 Recommended VS Code Extensions for TMS ePOD

## 🐍 Python Development (Essential)

### 1. **Python** (ms-python.python)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE
- **ฟีเจอร์:**
  - IntelliSense (autocomplete)
  - Linting (Pylint integration)
  - Debugging
  - Testing (pytest integration)
  - Jupyter notebook support
- **การตั้งค่า:**
```json
{
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false
}
```

### 2. **Pylance** (ms-python.vscode-pylance)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE
- **ฟีเจอร์:**
  - Fast IntelliSense
  - Type checking
  - Auto-imports
  - Better code completion

### 3. **Black Formatter** (ms-python.black-formatter)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE
- **ฟีเจอร์:**
  - Auto-format on save
  - Consistent code style
- **การตั้งค่า:**
```json
{
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  }
}
```

### 4. **isort** (ms-python.isort)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Auto-sort imports
  - Remove unused imports

---

## 🧪 Testing & Quality

### 5. **Python Test Explorer** (littlefoxteam.vscode-python-test-adapter)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE
- **ฟีเจอร์:**
  - Visual test runner
  - Run/debug individual tests
  - See test results in sidebar
  - Coverage visualization

### 6. **Coverage Gutters** (ryanluker.vscode-coverage-gutters)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Show coverage in editor (green/red lines)
  - See which lines are tested
- **การตั้งค่า:**
```json
{
  "coverage-gutters.coverageFileNames": [
    "coverage.xml",
    "htmlcov/index.html"
  ]
}
```

---

## 📱 React Native / JavaScript

### 7. **React Native Tools** (msjsdiag.vscode-react-native)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE (for mobile app)
- **ฟีเจอร์:**
  - Debugging React Native
  - IntelliSense for React
  - Run commands

### 8. **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Quick snippets (rnf, rnc, etc.)
  - Save typing time

### 9. **ESLint** (dbaeumer.vscode-eslint)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE
- **ฟีเจอร์:**
  - JavaScript linting
  - Auto-fix on save

### 10. **Prettier** (esbenp.prettier-vscode)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE
- **ฟีเจอร์:**
  - JavaScript/JSON formatter
- **การตั้งค่า:**
```json
{
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 🔍 Code Intelligence

### 11. **IntelliCode** (VisualStudioExptTeam.vscodeintellicode)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - AI-assisted code completion
  - Smart suggestions

### 12. **Path Intellisense** (christian-kohler.path-intellisense)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Autocomplete file paths
  - Prevent typos in imports

### 13. **Auto Import** (steoates.autoimport)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Automatically add imports
  - Save time

---

## 🎨 UI/UX Enhancement

### 14. **Material Icon Theme** (PKief.material-icon-theme)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Beautiful file icons
  - Easy to identify file types

### 15. **Indent Rainbow** (oderwat.indent-rainbow)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Colorize indentation
  - Easier to read nested code

### 16. **Bracket Pair Colorizer 2** (CoenraadS.bracket-pair-colorizer-2)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Color matching brackets
  - Easier to spot errors

---

## 🗄️ Database & API

### 17. **SQLTools** (mtxr.sqltools)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Connect to Supabase/PostgreSQL
  - Run queries in VS Code
  - Browse database

### 18. **Thunder Client** (rangav.vscode-thunder-client)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - REST API testing (like Postman)
  - Test Supabase API
  - Save requests

---

## 📝 Documentation

### 19. **Markdown All in One** (yzhang.markdown-all-in-one)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Markdown preview
  - Auto-complete
  - Table of contents

### 20. **Markdown Preview Mermaid** (bierner.markdown-mermaid)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Preview Mermaid diagrams
  - See architecture diagrams

---

## 🔐 Git & Version Control

### 21. **GitLens** (eamodio.gitlens)
- **ความสำคัญ:** ⭐⭐⭐⭐⭐ MUST HAVE
- **ฟีเจอร์:**
  - See who changed what line
  - Git blame inline
  - Compare commits
  - Visual file history

### 22. **Git Graph** (mhutchie.git-graph)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Visual git history
  - Easy branch management

---

## 🚀 Productivity

### 23. **Todo Tree** (Gruntfuggly.todo-tree)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Highlight TODO, FIXME, etc.
  - Quick navigation to todos

### 24. **Better Comments** (aaron-bond.better-comments)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Colorize comments (!, ?, TODO, etc.)
  - Easier to spot important notes

### 25. **Error Lens** (usernamehw.errorlens)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Show errors inline
  - No need to hover
  - Faster debugging

---

## 🎯 Streamlit Specific

### 26. **Streamlit Snippets** (danielfrg.streamlit-snippets)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Streamlit code snippets
  - Quick st.button, st.form, etc.

---

## 📦 Package Management

### 27. **Python Environment Manager** (donjayamanne.python-environment-manager)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Manage virtual environments
  - Switch Python versions

---

## 🔧 Configuration Files

### 28. **YAML** (redhat.vscode-yaml)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - YAML syntax highlighting
  - Validation
  - Auto-complete

### 29. **DotENV** (mikestead.dotenv)
- **ความสำคัญ:** ⭐⭐⭐⭐
- **ฟีเจอร์:**
  - Syntax highlighting for .env files
  - Easier to read

---

## 🎨 Theme (Optional)

### 30. **One Dark Pro** (zhuangtongfa.Material-theme)
- **ความสำคัญ:** ⭐⭐⭐
- **ฟีเจอร์:**
  - Beautiful dark theme
  - Easy on eyes

---

## 📋 Quick Install (Copy-Paste)

```bash
# Essential Extensions (Install these first!)
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension ms-python.black-formatter
code --install-extension ms-python.isort
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension eamodio.gitlens
code --install-extension littlefoxteam.vscode-python-test-adapter
code --install-extension ryanluker.vscode-coverage-gutters

# React Native (for mobile app)
code --install-extension msjsdiag.vscode-react-native
code --install-extension dsznajder.es7-react-js-snippets

# Productivity
code --install-extension usernamehw.errorlens
code --install-extension Gruntfuggly.todo-tree
code --install-extension rangav.vscode-thunder-client
code --install-extension mtxr.sqltools

# UI Enhancement
code --install-extension PKief.material-icon-theme
code --install-extension oderwat.indent-rainbow

# Documentation
code --install-extension yzhang.markdown-all-in-one
code --install-extension bierner.markdown-mermaid

# Config Files
code --install-extension redhat.vscode-yaml
code --install-extension mikestead.dotenv
```

---

## ⚙️ Recommended Settings.json

สร้างไฟล์ `.vscode/settings.json`:

```json
{
  // Python
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true,
  "python.formatting.provider": "black",
  "python.testing.pytestEnabled": true,
  "python.testing.unittestEnabled": false,
  "python.testing.pytestArgs": ["tests"],
  
  // Formatting
  "editor.formatOnSave": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter",
    "editor.codeActionsOnSave": {
      "source.organizeImports": true
    }
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  
  // Coverage
  "coverage-gutters.coverageFileNames": [
    "coverage.xml",
    "htmlcov/index.html"
  ],
  "coverage-gutters.showLineCoverage": true,
  
  // Editor
  "editor.rulers": [120],
  "editor.minimap.enabled": true,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  
  // Files
  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true,
    "**/.pytest_cache": true,
    "**/htmlcov": true,
    "**/.coverage": true
  },
  
  // Git
  "git.autofetch": true,
  "git.confirmSync": false,
  
  // Terminal
  "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

---

## 🎯 Priority Installation Order

### Phase 1: Must Have (Install Now!)
1. Python
2. Pylance
3. Black Formatter
4. ESLint
5. Prettier
6. GitLens
7. Python Test Explorer
8. Coverage Gutters

### Phase 2: Highly Recommended
9. React Native Tools
10. Error Lens
11. Thunder Client
12. Todo Tree
13. Material Icon Theme

### Phase 3: Nice to Have
14. Markdown All in One
15. Git Graph
16. Indent Rainbow
17. Better Comments

---

## 💡 Pro Tips

1. **Format on Save:** Enable `editor.formatOnSave` to auto-format
2. **Test Explorer:** Use sidebar to run individual tests
3. **Coverage:** Press `Ctrl+Shift+7` to toggle coverage display
4. **Git Blame:** Hover over line to see who changed it
5. **Quick Fix:** Press `Ctrl+.` for quick fixes
6. **Command Palette:** Press `Ctrl+Shift+P` for all commands

---

## 🔥 Keyboard Shortcuts to Learn

```
Ctrl+Shift+P    - Command Palette
Ctrl+P          - Quick Open File
Ctrl+Shift+F    - Search in Files
Ctrl+`          - Toggle Terminal
Ctrl+B          - Toggle Sidebar
Ctrl+Shift+E    - Explorer
Ctrl+Shift+G    - Git
Ctrl+Shift+D    - Debug
Ctrl+Shift+X    - Extensions
F5              - Start Debugging
Shift+F5        - Stop Debugging
F12             - Go to Definition
Alt+F12         - Peek Definition
Ctrl+.          - Quick Fix
```

---

**สร้างโดย:** Antigravity AI  
**วันที่:** 31 ธันวาคม 2025
