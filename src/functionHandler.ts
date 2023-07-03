
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { VectorStore } from "langchain/dist/vectorstores/base";
import AiProvider from "./aiProvider";
import {Storage} from '@google-cloud/storage';
import { Document } from "langchain/dist/document";

type FunctionHandlerInput = {
  [key: string]: RSS_DATA[]
}

type QueryParams = {
  page: number;
  query: string;
  next?: number;
}

function filterContent(doc?: string): string {
  return (doc || '').replace(/\n/g, ' ').replace(/\[\…\]/g, "..細節省略")
}

class FunctionHandler {
  inputs: RSS_DATA[];
  vectorStore: VectorStore;
  aiProvider: AiProvider;
  constructor(data: FunctionHandlerInput) {
    this.aiProvider = new AiProvider()
    this.inputs = this.flattenList(data)
    this.vectorStore = this.initVectorStore()
  }

  static async init(embeddedUrl: string) {
    const storage = new Storage();

    try {
      const contents = await storage.bucket("news_source").file("result.json").download();
      // const contents = await fetch(embeddedUrl)
      // const preLoadedData = await response.json()
      return new FunctionHandler(JSON.parse(contents.toString()))
    } catch (e) {
      console.error(e)
      return new FunctionHandler({})
    }
  }

  static functions() {
    return [
      {
        "name": "getLatestOnes",
        "description": "Get the latest posts.",
        "parameters": {
          "type": "object",
          "properties": {
            "page": {
              "type": "number",
              "description": "The page number for pagination. start from 1."
            }
          }
        }
      },
      {
        "name": "getReleatedOnes",
        "description": "Get the latest posts by user preference.",
        "parameters": {
          "type": "object",
          "properties": {
            "page": {
              "type": "number",
              "description": "The page number for pagination. start from 1."
            },
            "query": {
              "type": "string",
              "description": "Keyword or sentence to retrieving related posts."
            }
          },
          "required": ["query"]
        }
      },
      {
        "name": "getDetail",
        "description": "Get the detail content of most related detail post.",
        "parameters": {
          "type": "object",
          "properties": {
            "next": {
              "type": "number",
              "description": "Get the most related post, if none go the next post, starting from 1."
            },
            "query": {
              "type": "string",
              "description": "Detail reference information to get the most related post."
            }
          },
          "required": ["query"]
        }
      }
    ]
  }

  initVectorStore(): VectorStore {
    const embedding = this.aiProvider.getEmbeddingModule()
    const vectorStore = new MemoryVectorStore(embedding);
    const vectors: number[][] = [];
    const documents: any[] = []
    this.inputs.forEach((input: RSS_DATA, index: number) => {
      vectors.push(input.embeddingContent)
      documents.push({
        pageContent: input.content,
        metadata: {
          index
        }
      })
    })
    vectorStore.addVectors(vectors, documents)
    return vectorStore
  }

  flattenList(data: FunctionHandlerInput): RSS_DATA[] {
    const initialValues: RSS_DATA[] = []
    const result = Object.keys(data).reduce((accu, publisher) => {
      return [...accu, ...data[publisher]]
    }, initialValues).sort((a, b) => {
      const dateA = new Date(a.pubDate)
      const dateB = new Date(b.pubDate)
      // @ts-ignore
      return Number(dateB - dateA)
    })
    return result
  }

  getListByPage(page: number, inputs: RSS_DATA[]): RSS_DATA[] {
    const perPage = 10
    const totalPages = Math.ceil(inputs.length / perPage)
    const pageNum = (page && page > 0) ? page : 1
    if (pageNum > totalPages) {
      const startIndex = Math.max(inputs.length - perPage, 0)
      return inputs.slice(startIndex)
    }
    const startIndex = (pageNum - 1) * perPage
    const endIndex = Math.min(startIndex + perPage, inputs.length)
    return inputs.slice(startIndex, endIndex)
  }

  getLatestOnes(params: QueryParams): string {
    const list = this.getListByPage(params.page, this.inputs)
    if (list.length === 0) {
      return "這幾天看似沒有更新的新聞"
    }
    return list.map((item) => {
      item.content = filterContent(item.content)
      return `主題:${item.title}; ${item.content && ("內容:" + item.content + ";")}`
    }).join(';')
  }

  async getReleatedOnes(params: QueryParams): Promise<string> {
    const rawResult = await this.vectorStore.similaritySearchWithScore(params.query, 40)
    const filteredResult = rawResult.filter(([doc, score]) => {
      return score >= 0.5
    }).map(d => {
      const doc = d[0]
      return this.inputs[doc.metadata.index]
    }).filter(d => d)
    // console.info({filteredResult})

    const list = this.getListByPage(params.page,
      filteredResult
    )
    return list.map((item) => {
      item.content = filterContent(item.content)
      return `主題:${item.title}; ${item.content && ("內容:" + item.content + ";")}`
    }).join(';')
  }

  async getDetail(params: QueryParams): Promise<string> {
    const rawResult = await this.vectorStore.similaritySearchWithScore(params.query, 40)
    const next = params.next && params.next >= 1 ? params.next : 1
    if (!rawResult[next - 1]) {
      return "沒有更相關的內容了。"
    }
    const topResult = this.inputs[rawResult[next - 1][0].metadata.index]

    console.log({topResult})
    const content = [
      topResult['content:encoded'] || '',
      topResult['content:encodedSnippet'] || '',
      topResult['content'] || '',

    ].sort((a, b) => {
      return  b.length - a.length
    })[0]
    return filterContent(content)
  }

  getKeyword(query: string) {
    // using serper.dev
  }

  async consumeFunctionCall(functionMessage: ChatFunctionCallType): Promise<ChatMessageType | null> {
    const functionalCall = functionMessage.function_call.name
    const rawFunctionArguments = functionMessage.function_call.arguments
    const functionArguments = JSON.parse(rawFunctionArguments || '{}') || {}
    let content = ""
    console.info({functionMessage})
    switch (functionalCall) {
      case "getLatestOnes":
        content = this.getLatestOnes(functionArguments)
        return {
          role: "assistant",
          content
        }
      case "getReleatedOnes":
        content = await this.getReleatedOnes(functionArguments)
        return {
          role: "assistant",
          content
        }
      case "getDetail":
        content = await this.getDetail(functionArguments)
        return {
          role: "assistant",
          content
        }
    }
    return null
  }
}

export default FunctionHandler;
