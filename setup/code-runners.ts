import { CodeRunnerOutput, defineCodeRunnersSetup } from "@slidev/types";
import { loadPyodide, PyodideInterface } from "pyodide";
import { ref, h } from "vue";
import { useNav } from "@slidev/client";

let pyodideCache: PyodideInterface | null = null;
let pyodideOptionCache = "{}";

// Helper class to manage stdin inputs
class StdinManager {
  private inputs: string[];
  private currentIndex: number;

  constructor(inputs: string[] = []) {
    this.inputs = inputs;
    this.currentIndex = 0;
  }

  setInputs(inputs: string[]) {
    this.inputs = inputs;
    this.currentIndex = 0;
  }

  getNextInput(): string {
    if (this.currentIndex < this.inputs.length) {
      const input = this.inputs[this.currentIndex];
      this.currentIndex++;
      return input;
    }
    // Return empty string if no more inputs
    return "";
  }

  reset() {
    this.currentIndex = 0;
  }

  hasMoreInputs(): boolean {
    return this.currentIndex < this.inputs.length;
  }
}

async function setupPyodide(options = {}, code: string) {
  const {
    installs = [],
    prelude = "",
    loadPackagesFromImports = true,
    suppressDeprecationWarnings = true,
    alwaysReload = false,
    loadOptions = {},
    stdin = null, // Can be: array of strings, string (multiline), or 'interactive'
  } = options as any;

  if (alwaysReload || pyodideOptionCache !== JSON.stringify(options)) {
    pyodideCache = null;
    pyodideOptionCache = JSON.stringify(options);
  }

  if (pyodideCache) {
    if (loadPackagesFromImports) {
      await pyodideCache.loadPackagesFromImports(code);
    }
    return pyodideCache;
  }

  pyodideCache = await loadPyodide(loadOptions);

  if (prelude) {
    if (loadPackagesFromImports) {
      await pyodideCache.loadPackagesFromImports(prelude);
    }
    await pyodideCache.runPythonAsync(prelude);
  }

  // Pandas always throws a DeprecationWarning
  if (suppressDeprecationWarnings)
    await pyodideCache.runPythonAsync(`
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning) 
`);

  if (installs.length) {
    await pyodideCache.loadPackage("micropip");
    await pyodideCache.runPythonAsync(
      [
        "import micropip",
        "await micropip.install(" + JSON.stringify(installs) + ")",
      ].join("\n")
    );
  }

  if (loadPackagesFromImports) {
    await pyodideCache.loadPackagesFromImports(code);
  }

  return pyodideCache;
}

// Extract stdin inputs from code comments
function extractStdinFromCode(code: string): string[] {
  const inputs: string[] = [];
  const lines = code.split("\n");

  for (const line of lines) {
    // Look for patterns like: # stdin: "value" or # input: value
    const stdinMatch = line.match(/^#\s*(?:stdin|input):\s*(.+)$/i);
    if (stdinMatch) {
      let value = stdinMatch[1].trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      inputs.push(value);
    }
  }

  return inputs;
}

export default defineCodeRunnersSetup(() => {
  const { slides, currentPage } = useNav();

  async function run(code: string) {
    // @ts-expect-error
    const currentSlide = slides.value[currentPage.value - 1]
    const slideOptions = currentSlide?.meta?.slide?.frontmatter?.python || {}

    const pyodide = await setupPyodide(slideOptions, code);

    const texts = ref<string[]>([""]);
    const extras = ref<CodeRunnerOutput[]>([]);
    const stdinUsed = ref<string[]>([]);

    // Parse stdin configuration
    let stdinInputs: string[] = [];
    let isInteractive = false;

    if (slideOptions.stdin) {
      if (Array.isArray(slideOptions.stdin)) {
        stdinInputs = slideOptions.stdin;
      } else if (typeof slideOptions.stdin === "string") {
        if (slideOptions.stdin === "interactive") {
          isInteractive = true;
        } else {
          // Split multiline string into array of lines
          stdinInputs = slideOptions.stdin
            .split("\n")
            .filter((line) => line.trim() !== "");
        }
      }
    }

    // Also check for stdin inputs in code comments
    const stdinFromComments = extractStdinFromCode(code);
    if (stdinFromComments.length > 0 && stdinInputs.length === 0) {
      stdinInputs = stdinFromComments;
    }

    // Create a fresh StdinManager for this execution
    const stdinManager = new StdinManager(stdinInputs);

    // Configure stdin handler for this execution
    if (isInteractive) {
      // For interactive mode, use browser prompt
      pyodide.setStdin({
        stdin: () => {
          const input = prompt("Enter input:") || "";
          stdinUsed.value.push(input);
          return input;
        },
        isatty: true,
      });
    } else if (stdinInputs.length > 0) {
      // Use pre-defined inputs
      pyodide.setStdin({
        stdin: () => {
          const input = stdinManager.getNextInput();
          if (input !== "") {
            stdinUsed.value.push(input);
          }
          return input;
        },
        isatty: false,
      });
    } else {
      // No stdin configuration - return empty string on input()
      // This avoids I/O errors and allows code to run even without stdin
      pyodide.setStdin({
        stdin: () => {
          console.warn("No stdin input provided, returning empty string");
          return "";
        },
        isatty: false,
      });
    }

    const decoder = new TextDecoder("utf-8");

    function write(buffer: Uint8Array) {
      const text = decoder.decode(buffer);
      const lines = text.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (i === 0) {
          // Append to current line
          texts.value[texts.value.length - 1] += lines[i];
        } else {
          // Start new line
          texts.value.push(lines[i]);
        }
      }

      return buffer.length;
    }

    pyodide.setStdout({
      write: write,
      isatty: true,
    });

    pyodide.setStderr({
      write: write,
      isatty: true,
    });

    try {
      await pyodide.runPythonAsync(code);

      // Show stdin inputs if any were used
      // if (stdinUsed.value.length > 0) {
      //   extras.value.push({
      //     html: `<div style="margin-top: 0.5rem; padding: 0.5rem; background: #e8f4fd; border-left: 3px solid #2196F3; font-size: 0.9em;">
      //     <div style="font-weight: bold; margin-bottom: 0.25rem; color: #1976D2;">📥 stdin inputs used:</div>
      //     ${stdinUsed.value
      //       .map(
      //         (input, i) =>
      //           `<div style="padding-left: 1rem; font-family: monospace; color: #424242;">[${i}]: "${input}"</div>`
      //       )
      //       .join("")}
      //     </div>`,
      //   });
      // }
    } catch (err: any) {
      console.error(err);
      const str = err.toString();

      // Check for common errors
      const matchNotFoundError = str.match(
        /ModuleNotFoundError: No module named '(.*)'/
      );
      const matchEOFError = str.match(/EOFError/);
      const matchIOError = str.match(/OSError.*I\/O error/);

      if (matchNotFoundError) {
        extras.value.push({
          html: [
            `<div class="text-red">${matchNotFoundError[0]}</div>`,
            `<div class="text-blue">Tip: This may be because this package is not a <a href="https://pyodide.org/en/stable/usage/packages-in-pyodide.html">Pyodide builtin package</a>.`,
            "<br>You may need to install it by adding the package name to the `python.installs` array in your frontmatter.",
            `</div>`,
          ].join(""),
        });
      } else if (matchEOFError || matchIOError) {
        // Check if the code actually contains input() calls
        const hasInputCall = /input\s*\(/.test(code);

        if (hasInputCall) {
          extras.value.push({
            html: [
              `<div class="text-red">${str.split("\n")[0]}</div>`,
              `<div class="text-orange" style="margin-top: 0.5rem; padding: 0.75rem; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px;">`,
              `<strong>💡 Your code requires input!</strong><br><br>`,
              `Add stdin data in the frontmatter:`,
              `<pre style="margin: 0.5rem 0; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; overflow-x: auto;"><code>---
python:
  stdin:
    - "first input"
    - "second input"
---</code></pre>`,
              `Or use inline comments in your code:`,
              `<pre style="margin: 0.5rem 0; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; overflow-x: auto;"><code># stdin: "your input here"
name = input("Enter name: ")</code></pre>`,
              `Or enable interactive mode:`,
              `<pre style="margin: 0.5rem 0; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; overflow-x: auto;"><code>---
python:
  stdin: "interactive"
---</code></pre>`,
              `</div>`,
            ].join(""),
          });
        } else {
          extras.value.push({
            text: str,
            class: "text-red",
          });
        }
      } else {
        // Split error into lines for better readability
        const errorLines = str.split("\n");
        for (const line of errorLines) {
          if (line.trim()) {
            extras.value.push({
              text: line,
              class: "text-red",
            });
          }
        }
      }
    }

    return () => [
      ...texts.value
        .filter((text) => text !== "")
        .map((text) => ({ text, highlightLang: "ansi" })),
      ...extras.value,
    ];
  }

  return {
    python: run,
    py: run,
  };
});
