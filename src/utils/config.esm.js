/**
 * @file config.esm.js
 * @description 微信读书助手全局配置（ES模块版本，供background script使用）
 */

export const CONFIG = {
  // 日志前缀
  LOG_PREFIX: '阅读助手:',
  
  // API 相关
  API_ENDPOINTS: {
    wenxin: {
      url: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant',
      model: 'eb-instant'
    },
    qianwen: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen-turbo'
    },
    doubao: {
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      model: 'doubao-1-5-pro-256k-250115'
    },
    deepseek: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'deepseek-v3'
    }
  },

  // 服务商配置
  PROVIDERS: {
    wenxin: '文心一言',
    qianwen: '通义千问',
    doubao: '豆包',
    deepseek: 'DeepSeek'
  },

  // AI 提示词配置
  PROMPTS: {
    // 系统角色提示词
    SYSTEM: {
      explain: '你是一个专业的阅读助手，对作品《{book}》以及作者{author}非常熟悉，擅长用通俗易懂的方式解释复杂的概念和术语。请确保解释简洁明了，并在必要时提供相关的背景信息。',
      digest: '你是一个专业的阅读助手，对作品《{book}》以及作者{author}非常熟悉，擅长提炼文章的核心观点，分析其思想流派，阐述相关的历史演进，并能用通俗易懂的方式表达出来，保证内容既专业又易于理解。',
      analyze: '你是一个客观的分析助手，对作品《{book}》以及作者{author}非常熟悉，擅长从多个角度分析问题。请提供支持和反对的论据，引用相关学者观点或研究，并提供进一步阅读的参考资料。分析要求客观、全面、有理有据。',
      chat: '你是一个专业的阅读助手，对作品《{book}》以及作者{author}非常熟悉，擅长用通俗易懂的方式解释复杂的概念和术语。请确保解释简洁明了，并在必要时提供相关的背景信息。'
    },
    
    // 用户提示词模板
    USER: {
      explain: '我正在阅读{author}的《{book}》，其中提到的"{text}"我不了解，请使用通俗易懂的语言解释一下',
      digest: '我正在阅读{author}的《{book}》，对于书中的这段内容不是很理解，请使用通俗易懂的语言帮我理解并消化，看以从核心观点、思想流派和历史演进等方面进行分析：\n\n{text}',
      analyze: '我正在阅读{author}的《{book}》，对于书中的这个说法有些疑惑，请从多个角度分析以下观点，包括支持和反对的论据，并引用相关学者或研究：\n\n{text}',
      chat: '这是我们之前的谈话记录\n\n{context}，请根据这些信息继续回答我的问题：\n\n{text}',
    }
  }
}; 