# slidev-addon-python-runner

[![npm version](https://badge.fury.io/js/%40cxphoenix%2Fslidev-addon-python-runner.svg)](https://badge.fury.io/js/%40cxphoenix%2Fslidev-addon-python-runner)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/CXPhoenix/slidev-addon-python-runner/blob/main/LICENSE)
[![Slidev](https://img.shields.io/badge/slidev-addon-brightgreen.svg)](https://sli.dev/addons/)
[![Pyodide](https://img.shields.io/badge/powered%20by-Pyodide-orange.svg)](https://pyodide.org/)

為 [Slidev](https://sli.dev/) 中的 [Monaco Runner 功能](https://sli.dev/features/monaco-run) 提供的 Python 執行器。程式碼使用 [Pyodide](https://pyodide.org/) 在瀏覽器中執行。

![Demo](https://cdn.jsdelivr.net/gh/KermanX/slidev-addon-python-runner/assets/demo.png)

## 功能特色

- 🐍 在瀏覽器中執行 Python 程式碼
- 📦 支援從 PyPI 安裝套件
- ⚡ 自動載入匯入的內建套件
- 🔄 支援 stdin 輸入處理
- 🎨 支援 `py` 和 `python` 兩種語言識別碼
- 🛠️ 豐富的錯誤提示和除錯功能

## 使用方法

首先，安裝套件：

```bash
npm install @cxphoenix/slidev-addon-python-runner
```

然後，在 `slides.md` 檔案的 headmatter 中加入該 addon：

```md
---
addons:
  - slidev-addon-python-runner

# 此執行器的可選設定
python:
  # 從 PyPI 安裝套件。預設值：[]
  installs: ["cowsay", "numpy", "pandas"]

  # 用於設置環境的程式碼。預設值：""
  prelude: |
    GREETING_FROM_PRELUDE = "Hello, Slidev!"

  # 自動載入已匯入的內建套件。預設值：true
  loadPackagesFromImports: true

  # 停用 `pandas` 的煩人警告。預設值：true
  suppressDeprecationWarnings: true

  # 程式碼變更時總是重新載入 Python 環境。預設值：false
  alwaysReload: false

  # 傳遞給 `loadPyodide` 的選項。預設值：{}
  loadPyodideOptions: {}

  # stdin 輸入設定（可選）
  stdin: ["input1", "input2"]  # 預定義輸入陣列
  # 或者使用多行字串：
  # stdin: |
  #   first line
  #   second line
  # 或者啟用互動模式：
  # stdin: "interactive"
---
```

### 基本範例

若要新增互動式 Python 程式碼執行器，請使用 `monaco-run` 指令：

````md
```py {monaco-run}
from termcolor import colored
import pandas as pd
import numpy as np

print(colored("Hello, Slidev!", "blue"))

# 建立簡單的 DataFrame
df = pd.DataFrame({
    "A": [1, 2, 3, 4],
    "B": np.random.randn(4)
})
print(df)
```
````

### stdin 輸入處理

這個 addon 支援多種方式處理 stdin 輸入：

#### 方法 1：在 frontmatter 中預定義輸入

````md
---
python:
  stdin:
    - "Alice"
    - "25"
---

```py {monaco-run}
name = input("請輸入姓名: ")
age = input("請輸入年齡: ")
print(f"你好 {name}，你今年 {age} 歲")
```
````

#### 方法 2：使用程式碼註解定義輸入

````md
```py {monaco-run}
# stdin: "Bob"
# stdin: "30"
name = input("請輸入姓名: ")
age = input("請輸入年齡: ")
print(f"你好 {name}，你今年 {age} 歲")
```
````

#### 方法 3：啟用互動模式

````md
---
python:
  stdin: "interactive"
---

```py {monaco-run}
name = input("請輸入姓名: ")
print(f"你好 {name}！")
```
````

## 進階設定

### 錯誤處理

該 addon 提供智慧錯誤處理：

- **套件未找到**：自動提示如何安裝 PyPI 套件
- **輸入錯誤**：當程式碼需要 stdin 輸入時，提供詳細的設定說明
- **語法錯誤**：顯示清晰的錯誤訊息和行號

### 支援的語言識別碼

您可以使用以下任一語言識別碼：

````md
```python {monaco-run}
print("Hello World")
```

```py {monaco-run}
print("Hello World")
```
````

### Pyodide 打包選項

預設情況下，當建置投影片時（即 `slidev build`），`pyodide` 套件會被替換為 CDN 版本。這是因為 https://github.com/pyodide/pyodide/issues/1949 的問題，使用打包版本時會導致已匯入的 Python 套件遺失。

若要打包本地版本的 `pyodide`，請將 `PYODIDE_BUNDLE` 環境變數設為 `true`：

```bash
PYODIDE_BUNDLE=true slidev build
```

⚠️ **注意**：使用本地打包版本時，無法在靜態建置中匯入 Python 套件。

## 開發

本專案使用 TypeScript 開發，主要檔案結構：

- `setup/code-runners.ts` - 主要的 Python 執行器實作
- `vite.config.ts` - Vite 設定，處理 Pyodide 的打包邏輯
- `package.json` - 專案設定和相依性

### 本地開發

```bash
# 安裝相依性
pnpm install

# 啟動開發伺服器
pnpm dev

# 建置
pnpm build
```

## 致謝

本專案基於 [_Kerman](https://github.com/KermanX) 的原始開發工作。

**原開發者：**
- _Kerman ([@KermanX](https://github.com/KermanX))

**此 Repo 維護者：**
- CXPhoenix ([@CXPhoenix](https://github.com/CXPhoenix))

## 授權

MIT License
