import * as fs from "fs";
import * as path from "path";
import puppeteer, { Page } from "puppeteer";

function getDrawioFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getDrawioFiles(filePath));
    } else if (filePath.endsWith(".drawio")) {
      results.push(filePath);
    }
  }
  return results;
}

async function renderDrawio(page: Page, drawioPath: string) {
  const dir = path.dirname(drawioPath);
  const baseName = path.basename(drawioPath, ".drawio");
  const svgPath = path.join(dir, `${baseName}.svg`);
  const pngPath = path.join(dir, `${baseName}.png`);
  const pdfPath = path.join(dir, `${baseName}.pdf`);

  console.log(`\nRendering: ${drawioPath}`);

  // Read XML content
  const xmlContent = fs.readFileSync(drawioPath, "utf8");

  // Create Draw.io Viewer JSON config with visibility checks disabled
  const config = {
    highlight: "#3B52DF",
    nav: true,
    resize: true,
    lightbox: false,
    "check-visible-state": false,
    xml: xmlContent
  };

  const configJson = JSON.stringify(config);
  const encodedConfigJson = encodeURIComponent(configJson);

  // Load local Draw.io static viewer JS content to support offline rendering
  const viewerScriptPath = path.resolve(__dirname, "viewer-static.min.js");
  if (!fs.existsSync(viewerScriptPath)) {
    throw new Error(`viewer-static.min.js not found at ${viewerScriptPath}. Please run the download script or verify it exists.`);
  }
  const viewerScriptContent = fs.readFileSync(viewerScriptPath, "utf8");

  // Local HTML container with offline Draw.io static viewer script inlined
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Draw.io Exporter</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #12121E; /* matches diagram theme background */
      overflow: hidden;
      display: inline-block;
    }
    .mxgraph {
      display: inline-block;
      border: none;
    }
  </style>
  <script>
    // Define a dummy MathJax object to bypass dynamic CDN script loading
    window.MathJax = {
      startup: {
        pageReady: function() {}
      }
    };
    try {
      ${viewerScriptContent}
      if (window.Editor) {
        window.Editor.containsMath = function() { return false; };
      }
    } catch(e) {
      console.error("Error inside static viewer load:", e.message || e);
    }
  </script>
</head>
<body>
  <div class="mxgraph"></div>
  <script>
    try {
      const configStr = decodeURIComponent("${encodedConfigJson}");
      const element = document.querySelector(".mxgraph");
      element.setAttribute("data-mxgraph", configStr);
      
      if (window.GraphViewer) {
        window.GraphViewer.processElements();
      }
    } catch (e) {
      console.error("Error setting configuration:", e.message || e);
    }
  </script>
</body>
</html>
  `;

  // Load HTML page
  await page.setContent(html, { waitUntil: "load" });

  try {
    // Wait for the viewer script to render the XML to an SVG element in the DOM
    await page.waitForSelector("div.mxgraph svg", { timeout: 15000 });
  } catch (err: any) {
    throw new Error(`Failed to render Draw.io diagram in browser: ${err.message}`);
  }

  // Retrieve rendered SVG geometry
  const dimensions = await page.evaluate(() => {
    const svg = document.querySelector("div.mxgraph svg");
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height)
    };
  });

  if (!dimensions) {
    throw new Error(`Rendered SVG element dimensions could not be parsed.`);
  }

  // 1. Export SVG
  const svgHtml = await page.evaluate(() => {
    const svg = document.querySelector("div.mxgraph svg");
    return svg ? svg.outerHTML : "";
  });
  
  if (svgHtml) {
    const svgFileContent = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n${svgHtml}`;
    fs.writeFileSync(svgPath, svgFileContent, "utf8");
    console.log(`-> Generated SVG: ${svgPath}`);
  }

  // Configure high-DPI resolution viewport for 4K / High DPI PNG screenshots
  // Padding 20px added to width/height to avoid edge clipping
  const padding = 20;
  await page.setViewport({
    width: dimensions.width + padding * 2,
    height: dimensions.height + padding * 2,
    deviceScaleFactor: 4.0 // 4x scale factor generates ultra-crisp 4K level details
  });

  // 2. Export PNG
  const svgElement = await page.$("div.mxgraph svg");
  if (svgElement) {
    await svgElement.screenshot({
      path: pngPath,
      type: "png",
      omitBackground: false // Keep background color #12121E for rich design aesthetic
    });
    console.log(`-> Generated 4K PNG: ${pngPath}`);
  }

  // 3. Export PDF with matching custom dimensions & margins
  // Ensure we print with matching page size (+ margins) so page is cropped perfectly
  const pdfMargin = 40;
  await page.pdf({
    path: pdfPath,
    width: `${dimensions.width + pdfMargin * 2}px`,
    height: `${dimensions.height + pdfMargin * 2}px`,
    printBackground: true,
    pageRanges: "1",
    margin: {
      top: `${pdfMargin}px`,
      right: `${pdfMargin}px`,
      bottom: `${pdfMargin}px`,
      left: `${pdfMargin}px`
    }
  });
  console.log(`-> Generated PDF: ${pdfPath}`);
}

async function main() {
  const erdDir = path.resolve(__dirname, "../docs/erd/modules");
  if (!fs.existsSync(erdDir)) {
    console.error(`ERD modules directory not found at: ${erdDir}`);
    process.exit(1);
  }

  const drawioFiles = getDrawioFiles(erdDir);
  console.log(`Found ${drawioFiles.length} Draw.io diagram files to render.`);

  if (drawioFiles.length === 0) {
    console.log("No diagrams to render.");
    process.exit(0);
  }

  const startTime = Date.now();

  // Launch headless browser
  console.log("Launching headless browser to render diagrams...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();

    // Listen for browser logs & errors to ease debugging
    page.on("console", (msg) => {
      const text = msg.text();
      const type = msg.type() as string;
      // Ignore routine logs to avoid cluttering, but log errors/warnings
      if (type === "error" || type === "warning" || text.includes("error") || text.includes("fail")) {
        console.log(`[Browser Console] ${type.toUpperCase()}: ${text}`);
      }
    });
    page.on("pageerror", (err: any) => {
      console.error(`[Browser PageError]: ${err.message}`);
    });

    for (const file of drawioFiles) {
      try {
        await renderDrawio(page, file);
      } catch (err: any) {
        console.error(`Error rendering diagram for ${file}:`, err.message);
      }
    }
  } finally {
    await browser.close();
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nDraw.io rendering process completed successfully in ${duration} seconds.`);
}

main();
