import fs from "fs";
import path from "path";
import { IPermission } from "./permission.interface";

export interface DiscoveryOptions {
  modulesDir?: string;
  actionMapping?: Record<string, string>;
}

// Comprehensive default mappings from controller method prefix to action
const DEFAULT_ACTION_MAPPING: Record<string, string> = {
  get: "read",
  find: "read",
  list: "read",
  view: "read",
  fetch: "read",
  query: "read",
  search: "read",
  export: "export",
  create: "create",
  add: "create",
  insert: "create",
  update: "update",
  patch: "update",
  put: "update",
  edit: "update",
  delete: "delete",
  remove: "delete",
  destroy: "delete",
  approve: "approve",
  reject: "reject",
  assign: "assign",
  cancel: "cancel",
  complete: "complete",
  reply: "reply",
  refund: "refund",
  withdraw: "withdraw",
  override: "override",
  send: "send",
  verify: "verify",
  login: "login",
  logout: "logout",
  activate: "activate",
};

// Map Express/HTTP methods to default actions as fallback
const HTTP_METHOD_FALLBACK: Record<string, string> = {
  get: "read",
  post: "create",
  patch: "update",
  put: "update",
  delete: "delete",
};

/**
 * Format camelCase resource name to readable plural words for descriptions
 */
function getReadableResourcePlural(resource: string): string {
  // Split camelCase into words
  const words = resource
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase()
    .split(" ");

  let lastWord = words[words.length - 1];

  // Basic pluralization rules
  if (
    lastWord.endsWith("y") &&
    !lastWord.endsWith("ay") &&
    !lastWord.endsWith("ey") &&
    !lastWord.endsWith("oy") &&
    !lastWord.endsWith("uy")
  ) {
    lastWord = lastWord.slice(0, -1) + "ies";
  } else if (!lastWord.endsWith("s")) {
    lastWord = lastWord + "s";
  }

  words[words.length - 1] = lastWord;
  return words.join(" ");
}

/**
 * Generate human-readable permission description
 */
function generateDescription(resource: string, action: string): string {
  const pluralResource = getReadableResourcePlural(resource);
  const readableResource = resource
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();

  switch (action) {
    case "read":
      return `Can view ${pluralResource}`;
    case "create":
      return `Can create ${pluralResource}`;
    case "update":
      return `Can update ${pluralResource}`;
    case "delete":
      return `Can delete ${pluralResource}`;
    case "export":
      return `Can export ${pluralResource}`;
    case "reply":
      return `Can reply to ${readableResource}`;
    case "assign":
      return `Can assign ${pluralResource}`;
    case "cancel":
      return `Can cancel ${pluralResource}`;
    case "approve":
      return `Can approve ${pluralResource}`;
    case "reject":
      return `Can reject ${pluralResource}`;
    case "complete":
      return `Can complete ${pluralResource}`;
    case "refund":
      return `Can refund ${pluralResource}`;
    case "withdraw":
      return `Can withdraw ${pluralResource}`;
    case "override":
      return `Can override ${pluralResource}`;
    default:
      return `Can ${action} ${pluralResource}`;
  }
}

/**
 * Find all *.route.ts and *.routes.ts files in a directory recursively
 */
function findRouteFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findRouteFiles(filePath));
    } else if (file.endsWith(".route.ts") || file.endsWith(".routes.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Remove single-line and multi-line comments from string content
 */
function stripComments(content: string): string {
  let clean = content.replace(/\/\/.*$/gm, "");
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, "");
  return clean;
}

/**
 * Automatically scan modules and discover all permissions
 */
export async function discoverPermissions(options?: DiscoveryOptions): Promise<{
  permissions: Omit<IPermission, "createdAt" | "updatedAt">[];
  modulesScannedCount: number;
}> {
  const modulesDir =
    options?.modulesDir || path.join(__dirname, "../../../app/modules");
  const actionMapping = {
    ...DEFAULT_ACTION_MAPPING,
    ...(options?.actionMapping || {}),
  };

  const routeFiles = findRouteFiles(modulesDir);

  // Track scanned module directories to count them
  const scannedModules = new Set<string>();
  const discoveredPermissions: Omit<IPermission, "createdAt" | "updatedAt">[] =
    [];
  const permissionNames = new Set<string>();

  // Regular expression to match Controller.method references (allowing plural Controllers)
  const controllerMethodRegex =
    /\b([A-Za-z0-9_]+Controllers?)\.([A-Za-z0-9_]+)\b/g;

  // Pre-sort keys of action mapping by length descending for greedy matching
  const sortedActionKeys = Object.keys(actionMapping).sort(
    (a, b) => b.length - a.length,
  );

  for (const routeFile of routeFiles) {
    const relativePath = path.relative(modulesDir, routeFile);

    // Module name is the directory name
    const moduleName = relativePath.split(path.sep)[0];
    scannedModules.add(moduleName);

    // Resource name is the filename without extension (e.g. systemConfiguration.route.ts -> systemConfiguration)
    const baseName = path.basename(routeFile);
    const resourceName = baseName.replace(/\.routes?\.ts$/, "");

    const content = fs.readFileSync(routeFile, "utf-8");
    const cleanContent = stripComments(content);

    let match;
    controllerMethodRegex.lastIndex = 0; // reset regex state

    while ((match = controllerMethodRegex.exec(cleanContent)) !== null) {
      const methodName = match[2];
      const matchIndex = match.index;

      // Find closest preceding Express HTTP method (get, post, patch, put, delete)
      const precedingContent = cleanContent.substring(0, matchIndex);
      const httpMethodRegex = /\.(get|post|patch|put|delete)\s*\(/gi;
      let httpMethodMatch;
      let lastHttpMethod = "";
      let lastHttpMethodIndex = -1;
      let lastHttpMethodMatchStr = "";

      while (
        (httpMethodMatch = httpMethodRegex.exec(precedingContent)) !== null
      ) {
        lastHttpMethod = httpMethodMatch[1].toLowerCase();
        lastHttpMethodIndex = httpMethodMatch.index;
        lastHttpMethodMatchStr = httpMethodMatch[0];
      }

      // Check if the route is user/driver only (i.e. admin/superadmin has no business/involvement)
      let isUserOrDriverOnly = false;
      if (lastHttpMethodIndex !== -1 && lastHttpMethodMatchStr) {
        const start = lastHttpMethodIndex + lastHttpMethodMatchStr.length;
        const middlewareStr = precedingContent.substring(start);

        const hasUserOrDriver =
          /\b(isUser|isDriver|USER_ROLES\.USER|USER_ROLES\.DRIVER)\b/.test(
            middlewareStr,
          );
        const hasAdminOrAuth =
          /\b(isAdmin|isSuperAdmin|USER_ROLES\.ADMIN|USER_ROLES\.SUPER_ADMIN|isAuthenticated)\b/.test(
            middlewareStr,
          );

        if (hasUserOrDriver && !hasAdminOrAuth) {
          isUserOrDriverOnly = true;
        }
      }

      if (isUserOrDriverOnly) {
        continue;
      }

      // Determine action from method prefix or HTTP fallback
      let action = "";
      const lowerMethodName = methodName.toLowerCase();

      for (const prefix of sortedActionKeys) {
        if (lowerMethodName.startsWith(prefix.toLowerCase())) {
          action = actionMapping[prefix];
          break;
        }
      }

      if (!action && lastHttpMethod) {
        action = HTTP_METHOD_FALLBACK[lastHttpMethod];
      }

      // If action is resolved, construct permission object
      if (action) {
        const permissionName = `${resourceName}.${action}`.toLowerCase();

        // Skip duplicate permissions in the local scan list
        if (!permissionNames.has(permissionName)) {
          permissionNames.add(permissionName);

          const description = generateDescription(resourceName, action);

          discoveredPermissions.push({
            name: permissionName,
            resource: resourceName,
            action,
            description,
            module: moduleName,
            isActive: true,
            isSystem: true,
          });
        }
      }
    }
  }

  return {
    permissions: discoveredPermissions,
    modulesScannedCount: scannedModules.size,
  };
}
