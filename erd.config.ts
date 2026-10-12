import { defineConfig } from "erd-morph";

export default defineConfig({
  // output directory for generated diagrams
  outputDir: "./docs/erd",

  // theme: "light" | "dark" | "both"
  theme: "light",

  // export formats: "drawio", "svg", "png", "pdf"
  formats: ["drawio", "svg", "png", "pdf"],

  // whole diagram layout: "compact" | "full"
  wholeMode: "compact",

  // minimum incoming references to treat as hub entity (0 = adaptive)
  hubMinRefs: 0,
});
