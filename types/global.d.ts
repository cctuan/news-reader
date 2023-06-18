type RSS_DATA = {
  title: string;
  embeddingTitle: number[];
  link: string;
  pubDate: string;
  content?: string;
  embeddingContent: number[];
  contentRaw?: string;
  categories?: string[];
  tags: {name: string, description: string}[],
  ["content:encoded"]: string;
  ["content:encodedSnippet"]: string;
}

type ChatMessage = ChatMessageType | ChatFunctionType | ChatFunctionCallType;

type ChatMessageType = {
  role: string;
  content: string;
}

type ChatFunctionType = {
  role: string;
  name: string;
  content: string;
}

type ChatFunctionCallType = {
  role: string;
  function_call: {
    name: string;
    arguments: string;
  }
}