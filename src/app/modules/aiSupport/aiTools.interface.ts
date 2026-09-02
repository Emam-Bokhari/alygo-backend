export interface IToolParameterProperty {
  type: "STRING" | "NUMBER" | "BOOLEAN" | "OBJECT" | "ARRAY";
  description: string;
  enum?: string[];
  items?: {
    type: "STRING" | "NUMBER" | "BOOLEAN" | "OBJECT";
  };
}

export interface IToolParameters {
  type: "OBJECT";
  properties: Record<string, IToolParameterProperty>;
  required?: string[];
}

export interface IFunctionDeclaration {
  name: string;
  description: string;
  parameters?: IToolParameters;
}

export interface IToolExecutionContext {
  driverId: string;
}

export interface IToolExecutionResult {
  toolName: string;
  success: boolean;
  data: any;
  error?: string;
}
