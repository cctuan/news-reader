
import AiProvider from "./aiProvider";
import FunctionHandler from "./functionHandler"
import MemoryProvider from "./memoryProvider";

class ConversationHandler {
  functionHandler: FunctionHandler;
  memoryProvider: MemoryProvider;
  aiProvider: AiProvider;
  constructor(functionHandler: FunctionHandler, memoryProvider: MemoryProvider) {
    this.aiProvider = new AiProvider()
    this.functionHandler = functionHandler
    this.memoryProvider = memoryProvider
  }
  static async init() {
    const functionHandler = await FunctionHandler.init(process.env.EMBEDDED_DATA || '')
    const memoryProvider = await MemoryProvider.init()
    return new ConversationHandler(functionHandler, memoryProvider)
  }

  // call func
  // manage prompt
  // manage conversation - v
  // reply context
  async reply(text: string, sender: string, reply: Function): Promise<boolean> {
    const newLogs: ChatMessage[] = []
    const pastLogs = await this.memoryProvider.getLog(sender)
    pastLogs.push({
      role: "user",
      content: text
    })
    newLogs.push({
      role: "user",
      content: text
    })
    let responseLog = await this.aiProvider.answerChatMessage(pastLogs, FunctionHandler.functions())

    newLogs.push(responseLog)
    // @ts-ignore
    if (responseLog.function_call) {
      // @ts-ignore
      const systemChatLog = await this.functionHandler.consumeFunctionCall(responseLog)
      if (systemChatLog) {
        newLogs.push(systemChatLog)
        responseLog = systemChatLog
      }
    }
    // @ts-ignore
    reply(responseLog.content)
    await this.memoryProvider.appendLog(sender, newLogs)

    return true
  }
}

export default ConversationHandler
