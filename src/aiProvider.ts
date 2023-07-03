import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";


class AiProvider {
  openaiConfig: Configuration;
  constructor(){
    this.openaiConfig = new Configuration()
  }

  getEmbeddingModule(): OpenAIEmbeddings {
    return new OpenAIEmbeddings({
      openAIApiKey: process.env.OPEN_AI_KEY || '123',
      batchSize: 1024,
      modelName: "text-embedding-ada-002"
    }, this.openaiConfig);
  }
  
  // temporarily: langchain module doesn't support direct call functions
  async callChatCompletionApi(messages: any[], functions?: any[]) {
    const payload = {
      model: 'gpt-3.5-turbo-16k',
      messages: messages,
      temperature: 0.2,
    }
    if (functions) {
      // @ts-ignore
      payload.functions = functions
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      headers: {
        'Content-Type': 'application/json',
        // Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
        Authorization: `Bearer ${process.env.OPEN_AI_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const response = await res.json()
    return response
  }

  async answerChatMessage(chatLogs: ChatMessage[], functions?: any[]): Promise<ChatMessage> {
    const chatCompletion = await this.callChatCompletionApi(chatLogs, functions)
    // console.log({chatCompletion})
    if (chatCompletion && chatCompletion.choices.length && chatCompletion.choices[0].message) {
      // console.log(chatCompletion.choices[0])
      return chatCompletion.choices[0].message
    } else {
      console.log('completion: No response');
      return {
        role: "assistant",
        content: "回應出現些問題"
      }
    }
  } 
}

export default AiProvider
