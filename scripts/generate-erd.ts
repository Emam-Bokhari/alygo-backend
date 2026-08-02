import { Project, Node, SourceFile, ObjectLiteralExpression, PropertyAssignment, ArrayLiteralExpression, CallExpression } from "ts-morph";
import * as path from "path";
import * as fs from "fs";

interface ExtractedField {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  default?: string;
  enum?: string[];
  ref?: string;
  index?: string | boolean;
  isNested?: boolean;
  nestedFields?: ExtractedField[];
}

interface ExtractedSchema {
  name: string; // Model name or sub-schema name
  collectionName?: string;
  moduleName: string;
  filePath: string;
  fields: ExtractedField[];
  plugins: string[];
  indexes: { fields: string; unique?: boolean }[];
  virtuals: { name: string; ref?: string; localField?: string; foreignField?: string; justOne?: boolean }[];
  timestamps: boolean;
}

interface Relationship {
  source: string;
  target: string;
  type: "one-to-one" | "one-to-many";
  label: string;
}

// Clean up types for display
function cleanType(typeText: string): string {
  const text = typeText.trim();
  if (text.includes("ObjectId") || text.includes("Schema.Types.ObjectId") || text.includes("Types.ObjectId")) {
    return "objectId";
  }
  if (text === "String" || text.toLowerCase() === "string") return "string";
  if (text === "Number" || text.toLowerCase() === "number") return "number";
  if (text === "Boolean" || text.toLowerCase() === "boolean") return "boolean";
  if (text === "Date" || text.toLowerCase() === "date") return "date";
  if (text === "Mixed" || text.includes("Schema.Types.Mixed") || text.includes("Types.Mixed")) return "mixed";
  
  // Array types
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    return `${cleanType(inner)}[]`;
  }
  
  return text;
}

// Resolve enum values by parsing enums/objects recursively in the project files
function resolveEnumValues(sourceFile: SourceFile, name: string): string[] | undefined {
  // 1. Look for enum in current file
  const enumDec = sourceFile.getEnum(name);
  if (enumDec) {
    return enumDec.getMembers().map(m => {
      const val = m.getValue();
      return typeof val === "string" ? val : m.getName();
    });
  }
  
  // 2. Look for const variable in current file
  const varDec = sourceFile.getVariableDeclaration(name);
  if (varDec) {
    const init = varDec.getInitializer();
    if (init && Node.isObjectLiteralExpression(init)) {
      const values: string[] = [];
      for (const p of init.getProperties()) {
        if (Node.isPropertyAssignment(p)) {
          const valNode = p.getInitializer();
          if (valNode && Node.isStringLiteral(valNode)) {
            values.push(valNode.getLiteralValue());
          } else if (valNode) {
            values.push(valNode.getText());
          }
        }
      }
      return values;
    }
  }

  // 3. Look in import declarations
  for (const imp of sourceFile.getImportDeclarations()) {
    const namedImports = imp.getNamedImports().map(ni => ni.getName());
    if (namedImports.includes(name)) {
      const moduleSpecifier = imp.getModuleSpecifierValue();
      const project = sourceFile.getProject();
      const currentDir = sourceFile.getDirectoryPath();
      
      const absolutePath = path.resolve(currentDir, moduleSpecifier);
      const possiblePaths = [
        absolutePath + ".ts",
        absolutePath + "/index.ts",
        path.join(path.dirname(absolutePath), path.basename(absolutePath) + ".ts"),
        absolutePath
      ];
      
      for (const p of possiblePaths) {
        const resolvedFile = project.getSourceFile(p);
        if (resolvedFile) {
          const vals = resolveEnumValues(resolvedFile, name);
          if (vals) return vals;
        }
      }
    }
  }
  return undefined;
}

// Helper to extract enum values from field options
function extractEnum(sourceFile: SourceFile, node: Node): string[] | undefined {
  if (Node.isArrayLiteralExpression(node)) {
    return node.getElements().map(el => {
      if (Node.isStringLiteral(el)) return el.getLiteralValue();
      return el.getText();
    });
  }
  if (Node.isCallExpression(node)) {
    // e.g., Object.values(USER_ROLES)
    const exprText = node.getText();
    if (exprText.startsWith("Object.values(")) {
      const match = exprText.match(/Object\.values\(([^)]+)\)/);
      if (match) {
        const enumName = match[1].trim();
        return resolveEnumValues(sourceFile, enumName);
      }
    }
  }
  if (Node.isIdentifier(node)) {
    return resolveEnumValues(sourceFile, node.getText());
  }
  return undefined;
}

const MONGOOSE_FIELD_OPTIONS = new Set([
  "type", "required", "unique", "default", "enum", "index", "sparse", "ref",
  "select", "validate", "set", "get", "trim", "lowercase", "uppercase", "match",
  "min", "max", "minlength", "maxlength", "alias", "timestamps", "auto", "expires"
]);

function isMongooseFieldDefinition(objLiteral: ObjectLiteralExpression): boolean {
  const typeProp = objLiteral.getProperty("type");
  if (!typeProp) return false;
  
  // Check if there are other keys that are not standard mongoose options
  for (const prop of objLiteral.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getName();
      if (!MONGOOSE_FIELD_OPTIONS.has(name)) {
        return false;
      }
    }
  }
  return true;
}

function parseFieldInitializer(
  fieldName: string,
  initializer: Node,
  sourceFile: SourceFile
): ExtractedField | null {
  // Case 1: Simple type e.g., String, Schema.Types.ObjectId
  if (Node.isIdentifier(initializer) || Node.isPropertyAccessExpression(initializer)) {
    return {
      name: fieldName,
      type: cleanType(initializer.getText()),
      required: false,
      unique: false
    };
  }

  // Case 2: Array e.g., [String] or [{ type: Schema.Types.ObjectId, ref: 'User' }]
  if (Node.isArrayLiteralExpression(initializer)) {
    const elements = initializer.getElements();
    if (elements.length > 0) {
      const el = elements[0];
      if (Node.isObjectLiteralExpression(el)) {
        // Is it a field definition inside array? E.g., [{ type: String, required: true }]
        if (isMongooseFieldDefinition(el)) {
          const parsed = parseFieldInitializer(fieldName, el, sourceFile);
          if (parsed) {
            parsed.type = `${parsed.type}[]`;
            return parsed;
          }
        } else {
          // Array of embedded documents
          const nestedFields = parseSchemaObject(el, sourceFile);
          return {
            name: fieldName,
            type: "object[]",
            required: false,
            unique: false,
            isNested: true,
            nestedFields
          };
        }
      } else {
        // Array of simple type
        return {
          name: fieldName,
          type: `${cleanType(el.getText())}[]`,
          required: false,
          unique: false
        };
      }
    }
    return {
      name: fieldName,
      type: "array",
      required: false,
      unique: false
    };
  }

  // Case 3: Object Literal e.g., { type: String, required: true } or nested objects
  if (Node.isObjectLiteralExpression(initializer)) {
    if (isMongooseFieldDefinition(initializer)) {
      const typeProp = initializer.getProperty("type");
      if (typeProp && Node.isPropertyAssignment(typeProp)) {
        const typeInit = typeProp.getInitializer();
        if (typeInit) {
          if (Node.isObjectLiteralExpression(typeInit)) {
            // It is a nested object wrapped in 'type', e.g. fieldName: { type: { prop1: Type, prop2: Type }, select: 0 }
            const nestedFields = parseSchemaObject(typeInit, sourceFile);
            return {
              name: fieldName,
              type: "object",
              required: false,
              unique: false,
              isNested: true,
              nestedFields
            };
          } else if (Node.isArrayLiteralExpression(typeInit)) {
            // It is an array wrapped in 'type', e.g. fieldName: { type: [Number], required: true }
            const parsedArray = parseFieldInitializer(fieldName, typeInit, sourceFile);
            if (parsedArray) {
              // Copy other constraints from outer object literal to the parsed array field
              for (const p of initializer.getProperties()) {
                if (!Node.isPropertyAssignment(p)) continue;
                const name = p.getName();
                const initVal = p.getInitializer();
                if (!initVal) continue;

                if (name === "required") {
                  if (Node.isArrayLiteralExpression(initVal)) {
                    const first = initVal.getElements()[0];
                    parsedArray.required = first?.getText() === "true";
                  } else {
                    parsedArray.required = initVal.getText() === "true";
                  }
                } else if (name === "unique") {
                  parsedArray.unique = initVal.getText() === "true";
                } else if (name === "ref") {
                  parsedArray.ref = initVal.getText().replace(/['"]/g, "");
                } else if (name === "default") {
                  parsedArray.default = initVal.getText();
                } else if (name === "enum") {
                  parsedArray.enum = extractEnum(sourceFile, initVal);
                } else if (name === "index") {
                  parsedArray.index = initVal.getText();
                }
              }
              return parsedArray;
            }
          }
        }

        const typeText = typeInit?.getText() || "mixed";
        const field: ExtractedField = {
          name: fieldName,
          type: cleanType(typeText),
          required: false,
          unique: false
        };

        // Extract constraints
        for (const p of initializer.getProperties()) {
          if (!Node.isPropertyAssignment(p)) continue;
          const name = p.getName();
          const initVal = p.getInitializer();
          if (!initVal) continue;

          if (name === "required") {
            if (Node.isArrayLiteralExpression(initVal)) {
              const first = initVal.getElements()[0];
              field.required = first?.getText() === "true";
            } else {
              field.required = initVal.getText() === "true";
            }
          } else if (name === "unique") {
            field.unique = initVal.getText() === "true";
          } else if (name === "ref") {
            field.ref = initVal.getText().replace(/['"]/g, "");
          } else if (name === "default") {
            field.default = initVal.getText();
          } else if (name === "enum") {
            field.enum = extractEnum(sourceFile, initVal);
          } else if (name === "index") {
            field.index = initVal.getText();
          }
        }
        return field;
      }
    }

    // Otherwise, treat as a nested object (embedded document)
    const nestedFields = parseSchemaObject(initializer, sourceFile);
    return {
      name: fieldName,
      type: "object",
      required: false,
      unique: false,
      isNested: true,
      nestedFields
    };
  }

  return null;
}

function parseSchemaObject(objLiteral: ObjectLiteralExpression, sourceFile: SourceFile): ExtractedField[] {
  const fields: ExtractedField[] = [];
  for (const property of objLiteral.getProperties()) {
    if (Node.isPropertyAssignment(property)) {
      const fieldName = property.getName();
      const initializer = property.getInitializer();
      if (!initializer) continue;
      
      const parsed = parseFieldInitializer(fieldName, initializer, sourceFile);
      if (parsed) {
        fields.push(parsed);
      }
    }
  }
  return fields;
}

function analyzeFile(sourceFile: SourceFile, moduleName: string): ExtractedSchema[] {
  const schemas: ExtractedSchema[] = [];
  const schemaVarToModelMap = new Map<string, string>();
  const modelToSchemaMap = new Map<string, ExtractedSchema>();

  // 1. Find all Schema variable definitions: const xSchema = new Schema(...)
  const newExpressions = sourceFile.getDescendants().filter(Node.isNewExpression);
  for (const newExpr of newExpressions) {
    const constructorText = newExpr.getExpression().getText();
    if (constructorText === "Schema" || constructorText === "mongoose.Schema" || constructorText.endsWith(".Schema")) {
      // Find the VariableDeclaration parent
      const varDec = newExpr.getFirstAncestor(Node.isVariableDeclaration);
      const schemaVarName = varDec ? varDec.getName() : "AnonymousSchema";

      const args = newExpr.getArguments();
      if (args.length === 0) continue;

      const firstArg = args[0];
      const secondArg = args[1];

      let fields: ExtractedField[] = [];
      if (Node.isObjectLiteralExpression(firstArg)) {
        fields = parseSchemaObject(firstArg, sourceFile);
      }

      let timestamps = false;
      if (secondArg && Node.isObjectLiteralExpression(secondArg)) {
        const tsProp = secondArg.getProperty("timestamps");
        if (tsProp && Node.isPropertyAssignment(tsProp)) {
          timestamps = tsProp.getInitializer()?.getText() === "true";
        }
      }

      const schema: ExtractedSchema = {
        name: schemaVarName, // temporary name
        moduleName,
        filePath: sourceFile.getFilePath(),
        fields,
        plugins: [],
        indexes: [],
        virtuals: [],
        timestamps
      };

      modelToSchemaMap.set(schemaVarName, schema);
    }
  }

  // 2. Find schema extensions: xSchema.plugin(...), xSchema.index(...), xSchema.virtual(...)
  const callExpressions = sourceFile.getDescendants().filter(Node.isCallExpression);
  for (const call of callExpressions) {
    const expr = call.getExpression();
    if (Node.isPropertyAccessExpression(expr)) {
      const leftName = expr.getExpression().getText();
      const rightName = expr.getName();
      const schema = modelToSchemaMap.get(leftName);

      if (schema) {
        const args = call.getArguments();
        if (rightName === "plugin" && args.length > 0) {
          schema.plugins.push(args[0].getText());
        } else if (rightName === "index" && args.length > 0) {
          const idxFields = args[0].getText();
          let unique = false;
          if (args.length > 1 && Node.isObjectLiteralExpression(args[1])) {
            const uniqProp = args[1].getProperty("unique");
            if (uniqProp && Node.isPropertyAssignment(uniqProp)) {
              unique = uniqProp.getInitializer()?.getText() === "true";
            }
          }
          schema.indexes.push({ fields: idxFields, unique });
        } else if (rightName === "virtual" && args.length > 0) {
          const virtualName = args[0].getText().replace(/['"]/g, "");
          const virtualInfo: { name: string; ref?: string; localField?: string; foreignField?: string; justOne?: boolean } = { name: virtualName };
          
          if (args.length > 1 && Node.isObjectLiteralExpression(args[1])) {
            const opts = args[1];
            const refProp = opts.getProperty("ref");
            const localProp = opts.getProperty("localField");
            const foreignProp = opts.getProperty("foreignField");
            const justOneProp = opts.getProperty("justOne");

            if (refProp && Node.isPropertyAssignment(refProp)) {
              virtualInfo.ref = refProp.getInitializer()?.getText().replace(/['"]/g, "");
            }
            if (localProp && Node.isPropertyAssignment(localProp)) {
              virtualInfo.localField = localProp.getInitializer()?.getText().replace(/['"]/g, "");
            }
            if (foreignProp && Node.isPropertyAssignment(foreignProp)) {
              virtualInfo.foreignField = foreignProp.getInitializer()?.getText().replace(/['"]/g, "");
            }
            if (justOneProp && Node.isPropertyAssignment(justOneProp)) {
              virtualInfo.justOne = justOneProp.getInitializer()?.getText() === "true";
            }
          }
          schema.virtuals.push(virtualInfo);
        }
      }
    }
  }

  // 3. Find model calls: model("ModelName", schemaVar) or mongoose.model("ModelName", schemaVar)
  for (const call of callExpressions) {
    const expr = call.getExpression();
    const isModelCall = expr.getText() === "model" || 
                        expr.getText() === "mongoose.model" || 
                        expr.getText().endsWith(".model");
    
    if (isModelCall) {
      const args = call.getArguments();
      if (args.length >= 2) {
        const modelName = args[0].getText().replace(/['"]/g, "");
        const schemaArg = args[1];

        if (Node.isIdentifier(schemaArg)) {
          const schemaVarName = schemaArg.getText();
          schemaVarToModelMap.set(schemaVarName, modelName);
        } else if (Node.isNewExpression(schemaArg)) {
          // Direct inline Schema definition
          const schemaObj = schemaArg.getArguments()[0];
          let fields: ExtractedField[] = [];
          if (schemaObj && Node.isObjectLiteralExpression(schemaObj)) {
            fields = parseSchemaObject(schemaObj, sourceFile);
          }

          let timestamps = false;
          const optsObj = schemaArg.getArguments()[1];
          if (optsObj && Node.isObjectLiteralExpression(optsObj)) {
            const tsProp = optsObj.getProperty("timestamps");
            if (tsProp && Node.isPropertyAssignment(tsProp)) {
              timestamps = tsProp.getInitializer()?.getText() === "true";
            }
          }

          const schema: ExtractedSchema = {
            name: modelName,
            moduleName,
            filePath: sourceFile.getFilePath(),
            fields,
            plugins: [],
            indexes: [],
            virtuals: [],
            timestamps
          };
          schemas.push(schema);
        }
      }
    }
  }

  // Map variable-based schemas to their model names
  for (const [schemaVar, modelName] of schemaVarToModelMap.entries()) {
    const schema = modelToSchemaMap.get(schemaVar);
    if (schema) {
      schema.name = modelName;
      schemas.push(schema);
    }
  }

  return schemas;
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getModulePalette(moduleName: string): { fill: string, stroke: string } {
  const palettes = [
    { fill: "#1F203F", stroke: "#3B52DF" }, // Indigo
    { fill: "#162E3B", stroke: "#189AB4" }, // Teal
    { fill: "#281E3D", stroke: "#8A2BE2" }, // Purple
    { fill: "#142D26", stroke: "#10B981" }, // Emerald
    { fill: "#32221A", stroke: "#F59E0B" }, // Amber
    { fill: "#301A24", stroke: "#EC4899" }, // Rose
    { fill: "#2B223D", stroke: "#A78BFA" }, // Lavender
    { fill: "#1B2A32", stroke: "#06B6D4" }, // Cyan
  ];
  
  const name = moduleName || "default";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

function estimateRowHeight(labelHtml: string, colWidth: number): number {
  const plainText = labelHtml.replace(/<[^>]+>/g, "");
  const usableWidth = colWidth - 20; // 10px spacing left/right
  // Font size is 11px. Average character width is about 6.2px.
  const charsPerLine = Math.floor(usableWidth / 6.2);
  const lines = Math.ceil(plainText.length / charsPerLine) || 1;
  return 28 + (lines - 1) * 15; // 28px default height, +15px for each extra wrapped line
}

interface FieldLabelInfo {
  id: string;
  labelHtml: string;
}

function getFieldLabels(schema: ExtractedSchema, entName: string): FieldLabelInfo[] {
  const list: FieldLabelInfo[] = [];

  // 1. _id field
  list.push({
    id: `field_${entName}__id`,
    labelHtml: `<b>_id</b>: objectId <font color="#FFA500"><b>PK</b></font>`
  });

  // 2. Regular fields
  const addFields = (fields: ExtractedField[], prefix = "") => {
    for (const field of fields) {
      if (field.name === "_id") continue;
      if (field.isNested && field.type === "object[]") continue;
      if (field.isNested && field.type === "object" && field.nestedFields) {
        addFields(field.nestedFields, `${prefix}${field.name}_`);
        continue;
      }

      const cleanFieldName = `${prefix}${field.name}`.replace(/[^a-zA-Z0-9_]/g, "_");
      const typeText = field.type;
      
      let keysHtml = "";
      if (field.unique) {
        keysHtml += ` <font color="#FFA500"><b>UK</b></font>`;
      }
      if (field.ref) {
        keysHtml += ` <font color="#8BE9FD"><b>FK</b></font>`;
      }

      const comments: string[] = [];
      if (field.required) comments.push("required");
      if (field.default !== undefined) {
        comments.push(`def: ${field.default.replace(/"/g, "'")}`);
      }
      if (field.enum && field.enum.length > 0) {
        const cleanEnums = field.enum.map(ev => ev.replace(/"/g, "'"));
        comments.push(`enum: ${cleanEnums.join("|")}`);
      }
      if (field.index) comments.push("idx");

      const commentStr = comments.length > 0 ? ` <i><font color="#8E94B7">(${comments.join(", ")})</font></i>` : "";
      const labelHtml = `<b>${cleanFieldName}</b>: ${typeText}${keysHtml}${commentStr}`;

      list.push({
        id: `field_${entName}_${cleanFieldName}`,
        labelHtml
      });
    }
  };
  addFields(schema.fields);

  // 3. Timestamps
  if (schema.timestamps) {
    list.push({
      id: `field_${entName}_createdAt`,
      labelHtml: `<b>createdAt</b>: date <i><font color="#8E94B7">(ts)</font></i>`
    });
    list.push({
      id: `field_${entName}_updatedAt`,
      labelHtml: `<b>updatedAt</b>: date <i><font color="#8E94B7">(ts)</font></i>`
    });
  }

  return list;
}

function buildDrawioDiagram(
  moduleName: string,
  nativeSchemas: ExtractedSchema[],
  allSchemasMap: Map<string, ExtractedSchema>,
  moduleMap: Map<string, string[]>
): string {
  const schemasToRender = new Map<string, ExtractedSchema>();
  const relationships: Relationship[] = [];
  const nativeNames = new Set(nativeSchemas.map(s => s.name));

  // Add all native schemas to render
  for (const schema of nativeSchemas) {
    schemasToRender.set(schema.name, schema);
  }

  // Find Depth=1 related schemas and relationships
  for (const nativeSchema of nativeSchemas) {
    const checkFields = (fields: ExtractedField[], parentEntity: string) => {
      for (const field of fields) {
        if (field.ref) {
          const targetName = field.ref;
          relationships.push({
            source: targetName,
            target: parentEntity,
            type: (field.unique && !field.type.endsWith("[]")) ? "one-to-one" : "one-to-many",
            label: field.name
          });

          if (!schemasToRender.has(targetName)) {
            const targetSchema = allSchemasMap.get(targetName);
            if (targetSchema) {
              schemasToRender.set(targetName, targetSchema);
            } else {
              // Create a stub schema for boundary node
              schemasToRender.set(targetName, {
                name: targetName,
                moduleName: "shared",
                filePath: "",
                fields: [{ name: "_id", type: "objectId", required: true, unique: true }],
                plugins: [],
                indexes: [],
                virtuals: [],
                timestamps: false
              });
            }
          }
        }

        // Handle embedded documents
        if (field.isNested && field.nestedFields) {
          if (field.type === "object[]") {
            const subEntityName = `${parentEntity}_${capitalize(field.name)}`;
            schemasToRender.set(subEntityName, {
              name: subEntityName,
              moduleName: nativeSchema.moduleName,
              filePath: nativeSchema.filePath,
              fields: field.nestedFields,
              plugins: [],
              indexes: [],
              virtuals: [],
              timestamps: false
            });

            relationships.push({
              source: parentEntity,
              target: subEntityName,
              type: "one-to-many",
              label: field.name
            });
          }
        }
      }
    };

    checkFields(nativeSchema.fields, nativeSchema.name);

    // Virtual populates
    for (const virt of nativeSchema.virtuals) {
      if (virt.ref && virt.localField && virt.foreignField) {
        const targetName = virt.ref;
        relationships.push({
          source: nativeSchema.name,
          target: targetName,
          type: virt.justOne ? "one-to-one" : "one-to-many",
          label: `${virt.name} (virtual)`
        });

        if (!schemasToRender.has(targetName)) {
          const targetSchema = allSchemasMap.get(targetName);
          if (targetSchema) {
            schemasToRender.set(targetName, targetSchema);
          } else {
            schemasToRender.set(targetName, {
              name: targetName,
              moduleName: "shared",
              filePath: "",
              fields: [{ name: "_id", type: "objectId", required: true, unique: true }],
              plugins: [],
              indexes: [],
              virtuals: [],
              timestamps: false
            });
          }
        }
      }
    }
  }

  // Sort entities by module first, then alphabetically
  const sortedEntityNames = Array.from(schemasToRender.keys()).sort((a, b) => {
    const schemaA = schemasToRender.get(a)!;
    const schemaB = schemasToRender.get(b)!;
    if (schemaA.moduleName !== schemaB.moduleName) {
      return schemaA.moduleName.localeCompare(schemaB.moduleName);
    }
    return a.localeCompare(b);
  });

  const isWhole = moduleName === "whole-er-diagram";
  const colWidth = 340; // Increased width for better readability

  const schemaInfos = new Map<string, {
    labels: FieldLabelInfo[];
    heights: number[];
    totalHeight: number;
  }>();

  for (const entName of sortedEntityNames) {
    const schema = schemasToRender.get(entName)!;
    const labels = getFieldLabels(schema, entName);
    const heights = labels.map(l => estimateRowHeight(l.labelHtml, colWidth));
    const totalHeight = 38 + heights.reduce((sum, h) => sum + h, 0);
    schemaInfos.set(entName, { labels, heights, totalHeight });
  }

  // XML construction
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<mxfile host="Electron" modified="${new Date().toISOString()}" agent="Antigravity" version="24.0.0" type="device">\n`;
  xml += `  <diagram id="Page-1" name="Page-1">\n`;
  // Deep space dark theme canvas background
  xml += `    <mxGraphModel dx="1422" dy="804" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0" background="#0D0E15">\n`;
  xml += `      <root>\n`;
  xml += `        <mxCell id="0" />\n`;
  xml += `        <mxCell id="1" parent="0" />\n`;

  // Layout structures
  const tableRelativePositions = new Map<string, { rx: number, ry: number }>();
  const tableParentIds = new Map<string, string>();

  if (isWhole) {
    // ----------------------------------------------------
    // PROJECT-WIDE DIAGRAM LAYOUT: Module Containers
    // ----------------------------------------------------
    const modulesWithTables = new Map<string, string[]>();
    for (const entName of sortedEntityNames) {
      const schema = schemasToRender.get(entName)!;
      const mName = schema.moduleName || "shared";
      if (!modulesWithTables.has(mName)) {
        modulesWithTables.set(mName, []);
      }
      modulesWithTables.get(mName)!.push(entName);
    }

    const sortedModuleNames = Array.from(modulesWithTables.keys()).sort();

    const moduleCardPaddingX = 25;
    const moduleCardPaddingTop = 55; // space for the header title of the container
    const moduleCardPaddingBottom = 25;
    const tableGap = 35;

    const moduleCardWidth = colWidth + 2 * moduleCardPaddingX; // 390px
    const moduleCardHeights = new Map<string, number>();

    // Calculate height of each module container
    for (const mName of sortedModuleNames) {
      const tNames = modulesWithTables.get(mName)!;
      let currentRelY = moduleCardPaddingTop;
      for (let i = 0; i < tNames.length; i++) {
        const tName = tNames[i];
        tableRelativePositions.set(tName, { rx: moduleCardPaddingX, ry: currentRelY });
        tableParentIds.set(tName, `module_${mName}`);
        const tHeight = schemaInfos.get(tName)!.totalHeight;
        currentRelY += tHeight;
        if (i < tNames.length - 1) {
          currentRelY += tableGap;
        }
      }
      const cardHeight = currentRelY + moduleCardPaddingBottom;
      moduleCardHeights.set(mName, cardHeight);
    }

    // Grid layout for module containers (5 columns, height-balanced)
    const numColumns = 5;
    const colGap = 140;
    const rowGap = 100;
    const colXs = Array.from({ length: numColumns }, (_, i) => 50 + i * (moduleCardWidth + colGap));
    const colYs = Array.from({ length: numColumns }, () => 50);

    for (const mName of sortedModuleNames) {
      const cardHeight = moduleCardHeights.get(mName)!;
      let minColIdx = 0;
      for (let i = 1; i < numColumns; i++) {
        if (colYs[i] < colYs[minColIdx]) {
          minColIdx = i;
        }
      }

      const x = colXs[minColIdx];
      const y = colYs[minColIdx];
      const cardId = `module_${mName}`;
      const palette = getModulePalette(mName);
      const title = `${capitalize(mName)} Module`;

      // Modern container styled card (container=1 enables drag-together in Draw.io)
      const cardStyle = `rounded=1;whiteSpace=wrap;html=1;fillColor=#131522;strokeColor=${palette.stroke};strokeWidth=2.5;arcSize=6;align=left;verticalAlign=top;spacingLeft=15;spacingTop=12;fontColor=#FFFFFF;fontSize=14;fontStyle=1;container=1;collapsible=0;recursiveResize=0;`;
      xml += `        <mxCell id="${cardId}" value="${escapeXml(title)}" style="${cardStyle}" vertex="1" parent="1">\n`;
      xml += `          <mxGeometry x="${x}" y="${y}" width="${moduleCardWidth}" height="${cardHeight}" as="geometry" />\n`;
      xml += `        </mxCell>\n`;

      colYs[minColIdx] = y + cardHeight + rowGap;
    }
  } else {
    // ----------------------------------------------------
    // SINGLE MODULE DIAGRAM LAYOUT: Column Separation
    // ----------------------------------------------------
    const leftTables: string[] = [];
    const centerTables: string[] = [];
    const rightTables: string[] = [];

    for (const entName of sortedEntityNames) {
      if (nativeNames.has(entName)) {
        centerTables.push(entName);
      } else {
        const isLookup = relationships.some(rel => rel.source === entName && nativeNames.has(rel.target));
        if (isLookup) {
          leftTables.push(entName);
        } else {
          rightTables.push(entName);
        }
      }
    }

    const singleModuleGapX = 220;
    const singleModuleRowGap = 65;
    const containerPaddingX = 25;
    const containerPaddingTop = 55;
    const containerPaddingBottom = 25;

    const columnWidth = colWidth;
    const containerWidth = columnWidth + 2 * containerPaddingX; // 390px

    const columnsConfig = [
      { type: "left" as const, title: "Parent Lookups / External Dependencies", tables: leftTables, color: "#4B5563" },
      { type: "center" as const, title: `Core Module: ${capitalize(moduleName)}`, tables: centerTables, color: getModulePalette(moduleName).stroke },
      { type: "right" as const, title: "Dependent Entities & Sub-Schemas", tables: rightTables, color: "#6B7280" }
    ].filter(c => c.tables.length > 0);

    const columnHeights = columnsConfig.map(col => {
      let height = containerPaddingTop;
      for (let i = 0; i < col.tables.length; i++) {
        const tName = col.tables[i];
        height += schemaInfos.get(tName)!.totalHeight;
        if (i < col.tables.length - 1) {
          height += singleModuleRowGap;
        }
      }
      height += containerPaddingBottom;
      return height;
    });

    const maxHeight = Math.max(...columnHeights, 100);

    let currentX = 50;
    for (let idx = 0; idx < columnsConfig.length; idx++) {
      const col = columnsConfig[idx];
      const colHeight = columnHeights[idx];
      const startY = 50 + (maxHeight - colHeight) / 2; // Vertically center column

      const cardId = `column_${col.type}`;
      const cardStyle = `rounded=1;whiteSpace=wrap;html=1;fillColor=#131522;strokeColor=${col.color};strokeWidth=2.5;arcSize=6;align=left;verticalAlign=top;spacingLeft=15;spacingTop=12;fontColor=#FFFFFF;fontSize=14;fontStyle=1;container=1;collapsible=0;recursiveResize=0;`;
      
      xml += `        <mxCell id="${cardId}" value="${escapeXml(col.title)}" style="${cardStyle}" vertex="1" parent="1">\n`;
      xml += `          <mxGeometry x="${currentX}" y="${startY}" width="${containerWidth}" height="${colHeight}" as="geometry" />\n`;
      xml += `        </mxCell>\n`;

      let currentRelY = containerPaddingTop;
      for (let i = 0; i < col.tables.length; i++) {
        const tName = col.tables[i];
        tableRelativePositions.set(tName, { rx: containerPaddingX, ry: currentRelY });
        tableParentIds.set(tName, cardId);
        const tHeight = schemaInfos.get(tName)!.totalHeight;
        currentRelY += tHeight + singleModuleRowGap;
      }

      currentX += containerWidth + singleModuleGapX;
    }
  }

  // Draw tables and fields inside their containers
  for (const entName of sortedEntityNames) {
    const schema = schemasToRender.get(entName)!;
    const rpos = tableRelativePositions.get(entName)!;
    const parentId = tableParentIds.get(entName)!;
    const info = schemaInfos.get(entName)!;
    const tableId = `table_${entName}`;

    const isNative = isWhole || nativeNames.has(entName);
    
    let fill, stroke, fontColor;
    if (!isNative) {
      fill = "#1E1E28";
      stroke = "#4B5563";
      fontColor = "#9CA3AF";
    } else {
      const palette = getModulePalette(schema.moduleName);
      fill = palette.fill;
      stroke = palette.stroke;
      fontColor = "#FFFFFF";
    }

    const tableStyle = `swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=38;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};strokeWidth=2;fontColor=${fontColor};fontSize=13;align=center;`;
    
    xml += `        <mxCell id="${tableId}" value="${escapeXml(entName)}" style="${tableStyle}" vertex="1" parent="${parentId}">\n`;
    xml += `          <mxGeometry x="${rpos.rx}" y="${rpos.ry}" width="${colWidth}" height="${info.totalHeight}" as="geometry" />\n`;
    xml += `        </mxCell>\n`;

    let currentY = 38;
    const rowFontColor = isNative ? "#D0D2E6" : "#8E94B7";
    const rowStyle = `text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=10;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;fontSize=11;fontColor=${rowFontColor};`;

    for (let i = 0; i < info.labels.length; i++) {
      const fLabel = info.labels[i];
      const fHeight = info.heights[i];
      
      xml += `        <mxCell id="${fLabel.id}" value="${escapeXml(fLabel.labelHtml)}" style="${rowStyle}" vertex="1" parent="${tableId}">\n`;
      xml += `          <mxGeometry y="${currentY}" width="${colWidth}" height="${fHeight}" as="geometry" />\n`;
      xml += `        </mxCell>\n`;
      currentY += fHeight;
    }
  }

  // Draw relationship connectors
  const renderedRelationships = new Set<string>();
  let edgeIdCounter = 1;

  for (const rel of relationships) {
    const hasNativeNode = nativeNames.has(rel.source) || nativeNames.has(rel.target);
    if (!hasNativeNode) continue;

    const key = `${rel.source}-${rel.target}-${rel.label}`;
    const reverseKey = `${rel.target}-${rel.source}-${rel.label}`;
    if (renderedRelationships.has(key) || renderedRelationships.has(reverseKey)) continue;
    renderedRelationships.add(key);

    const edgeId = `edge_${edgeIdCounter++}`;
    
    const sourceSchema = schemasToRender.get(rel.source);
    const targetSchema = schemasToRender.get(rel.target);

    let sourceCellId = `field_${rel.source}__id`;
    if (!sourceSchema) {
      sourceCellId = `table_${rel.source}`;
    }

    const cleanTargetField = rel.label.replace(/[^a-zA-Z0-9_]/g, "_");
    let targetCellId = `field_${rel.target}_${cleanTargetField}`;

    if (!targetSchema) {
      targetCellId = `table_${rel.target}`;
    } else {
      const targetLabels = getFieldLabels(targetSchema, rel.target);
      const fieldExists = targetLabels.some(l => l.id === targetCellId);
      if (!fieldExists) {
        targetCellId = `table_${rel.target}`;
      }
    }

    const startArrow = "ERone";
    const endArrow = rel.type === "one-to-one" ? "ERone" : "ERmany";

    const sourceModule = sourceSchema ? sourceSchema.moduleName : "shared";
    const targetModule = targetSchema ? targetSchema.moduleName : "shared";
    const isIntraModule = sourceModule === targetModule;

    let edgeStyle = "";
    if (isWhole) {
      // Cross-module vs local relationship styling for the whole diagram
      if (isIntraModule && sourceModule && sourceModule !== "shared") {
        const palette = getModulePalette(sourceModule);
        edgeStyle = `edgeStyle=entityRelationEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${palette.stroke};strokeWidth=2;startArrow=${startArrow};startFill=0;endArrow=${endArrow};endFill=0;fontSize=10;fontColor=#A0A5C0;`;
      } else {
        // Inter-module relationships: dashed muted gray
        edgeStyle = `edgeStyle=entityRelationEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4B5563;strokeWidth=1.5;dashed=1;startArrow=${startArrow};startFill=0;endArrow=${endArrow};endFill=0;fontSize=9;fontColor=#8E94B7;`;
      }
    } else {
      // In single module view, make connections solid and colored based on module accent
      const modulePalette = getModulePalette(moduleName);
      edgeStyle = `edgeStyle=entityRelationEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=${modulePalette.stroke};strokeWidth=2;startArrow=${startArrow};startFill=0;endArrow=${endArrow};endFill=0;fontSize=10;fontColor=#A0A5C0;`;
    }

    xml += `        <mxCell id="${edgeId}" value="${escapeXml(rel.label)}" style="${edgeStyle}" edge="1" parent="1" source="${sourceCellId}" target="${targetCellId}">\n`;
    xml += `          <mxGeometry relative="1" as="geometry" />\n`;
    xml += `        </mxCell>\n`;
  }

  xml += `      </root>\n`;
  xml += `    </mxGraphModel>\n`;
  xml += `  </diagram>\n`;
  xml += `</mxfile>\n`;

  return xml;
}

function deleteOldMmdFiles(dir: string) {
  if (!fs.existsSync(dir)) return;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      deleteOldMmdFiles(filePath);
    } else if (file.endsWith(".mmd")) {
      fs.unlinkSync(filePath);
      console.log(`Deleted legacy Mermaid file: ${filePath}`);
    }
  }
}

function main() {
  console.log("Analyzing project schemas and models using ts-morph AST...");

  const project = new Project({
    tsConfigFilePath: path.resolve(__dirname, "../tsconfig.json")
  });

  const modulesDir = path.resolve(__dirname, "../src/app/modules");
  if (!fs.existsSync(modulesDir)) {
    console.error(`Modules directory not found at: ${modulesDir}`);
    process.exit(1);
  }

  // 1. Scan modules
  const subdirs = fs.readdirSync(modulesDir).filter(f => {
    return fs.statSync(path.join(modulesDir, f)).isDirectory();
  });

  console.log(`Discovered ${subdirs.length} modules.`);

  const allSchemas: ExtractedSchema[] = [];
  const moduleMap = new Map<string, string[]>(); // Map module name to its model names

  for (const moduleName of subdirs) {
    const modulePath = path.join(modulesDir, moduleName);
    const sourceFiles = project.addSourceFilesAtPaths(path.join(modulePath, "**/*.ts"));

    moduleMap.set(moduleName, []);

    for (const sourceFile of sourceFiles) {
      const fileSchemas = analyzeFile(sourceFile, moduleName);
      if (fileSchemas.length > 0) {
        allSchemas.push(...fileSchemas);
        for (const s of fileSchemas) {
          moduleMap.get(moduleName)!.push(s.name);
        }
      }
    }
  }

  // Build a map of all schemas by model name for easy lookup
  const allSchemasMap = new Map<string, ExtractedSchema>();
  for (const s of allSchemas) {
    allSchemasMap.set(s.name, s);
  }

  console.log(`Extracted ${allSchemas.length} models across modules.`);

  // 2. Generate ER diagrams for each module
  const outputDir = path.resolve(__dirname, "../docs/erd/modules");
  
  // Clean up legacy .mmd files from previous configurations
  console.log("Cleaning up any old .mmd Mermaid diagrams...");
  deleteOldMmdFiles(outputDir);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const moduleName of subdirs) {
    const nativeSchemas = allSchemas.filter(s => s.moduleName === moduleName);
    if (nativeSchemas.length === 0) {
      continue; // Skip modules without models
    }

    const xmlContent = buildDrawioDiagram(moduleName, nativeSchemas, allSchemasMap, moduleMap);
    
    const moduleOutputDir = path.join(outputDir, moduleName);
    if (!fs.existsSync(moduleOutputDir)) {
      fs.mkdirSync(moduleOutputDir, { recursive: true });
    }

    const outputPath = path.join(moduleOutputDir, "er-diagram.drawio");
    fs.writeFileSync(outputPath, xmlContent, "utf8");
    console.log(`Generated ER diagram for module "${moduleName}" at: docs/erd/modules/${moduleName}/er-diagram.drawio`);
  }

  // 3. Generate the project-wide (whole) ER diagram
  if (allSchemas.length > 0) {
    const wholeOutputDir = path.join(outputDir, "whole-er-diagram");
    if (!fs.existsSync(wholeOutputDir)) {
      fs.mkdirSync(wholeOutputDir, { recursive: true });
    }
    const wholeXmlContent = buildDrawioDiagram("whole-er-diagram", allSchemas, allSchemasMap, moduleMap);
    const wholeOutputPath = path.join(wholeOutputDir, "er-diagram.drawio");
    fs.writeFileSync(wholeOutputPath, wholeXmlContent, "utf8");
    console.log(`Generated project-wide ER diagram at: docs/erd/modules/whole-er-diagram/er-diagram.drawio`);
  }

  console.log("AST schema parsing and Draw.io XML diagram generation completed successfully.");
}

main();
