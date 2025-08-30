---
theme: default
layout: default
lineNumbers: on
python:
  # Install packages from PyPI. Default: []
  installs: ["cowsay"]

  # Code executed to set up the environment. Default: ""
  prelude: |
    GREETING_FROM_PRELUDE = "Hello, Slidev!"

  # Automatically load the imported builtin packages. Default: true
  loadPackagesFromImports: true

  # Disable annoying warning from `pandas`. Default: true
  suppressDeprecationWarnings: true

  # Always reload the Python environment when the code changes. Default: false
  alwaysReload: false

  # Options passed to `loadPyodide`. Default: {}
  loadPyodideOptions: {}
---

# Python Runner for Slidev

```py {monaco-run}
from termcolor import colored
import pandas as pd
import numpy as np

print(colored(GREETING_FROM_PRELUDE, "blue"))

df = pd.DataFrame({
  "A": 1.0,
  "B": pd.Timestamp("20130102"),
  "C": pd.Series(1, index=list(range(4)), dtype="float32"),
  "D": np.array([3] * 4, dtype="int32"),
  "E": pd.Categorical(["test", "train", "test", "train"]),
  "F": "foo"
})

print(df)
```

---

# Python Input Testing

```py {monaco-run} {autorun: false}
name = input()
print(f"hello {name}")
```