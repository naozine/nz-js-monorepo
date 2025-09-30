export interface ElementInfo {
  url: string;
  title?: string;
  xpath?: string;
  cssSelector?: string;
  outerHTMLSnippet?: string;
  attributes?: Record<string, string>;
  textSnippet?: string;
  timestamp: number;
}
