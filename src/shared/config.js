/**
 * @file config.js
 * @description 微信读书助手全局配置
 */

export const CONFIG = {
  // 项目基础配置
  PROJECT: 'DeepReadingHelper',
  LOG_PREFIX: '阅读助手:',

  // DOM 相关配置
  COPY_BUTTON_CLASS: 'wr_copy',
  MAX_CONTEXT_LENGTH: 2000,
  LOCAL_STORAGE_KEY: 'DeepReadingHelper_Settings',

  // API 相关配置
  API_ENDPOINTS: {
    wenxin: {
      url: 'https://qianfan.baidubce.com/v2/chat/completions',
      model: 'ernie-4.5-turbo-128k',
      consoleUrl: 'https://console.bce.baidu.com/qianfan/ais/console/applicationManage/application',
      modelListUrl: 'https://cloud.baidu.com/doc/qianfan/s/rmh4stp0j',
    },
    qianwen: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen-turbo',
      consoleUrl: 'https://dashscope.console.aliyun.com/apiKey',
      modelListUrl: 'https://help.aliyun.com/zh/model-studio/models',
    },
    doubao: {
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      model: 'doubao-1-5-pro-256k-250115',
      consoleUrl: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
      modelListUrl: 'https://www.volcengine.com/docs/82379/1330310',
    },
    kimi: {
      url: 'https://api.moonshot.cn/v1/chat/completions',
      model: 'moonshot-v1-8k',
      consoleUrl: 'https://platform.moonshot.cn/console/api-keys',
      modelListUrl:
        'https://platform.moonshot.cn/docs/introduction#%E6%A8%A1%E5%9E%8B%E5%88%97%E8%A1%A8',
    },
    minimax: {
      url: 'https://api.minimaxi.com/v1/chat/completions',
      model: 'MiniMax-M2.1-lightning',
      consoleUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
      modelListUrl: 'https://platform.minimaxi.com/docs/guides/text-generation',
    },
    zhipu: {
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: 'glm-4-flash',
      consoleUrl: 'https://open.bigmodel.ai/usercenter/apikeys',
      modelListUrl: 'https://open.bigmodel.cn/dev/api/normal-model/glm-4',
    },
  },

  // 服务商配置
  PROVIDERS: {
    qianwen: '千问',
    doubao: '豆包',
    kimi: 'Kimi',
    minimax: 'MiniMax',
    zhipu: '智谱',
    wenxin: '文心一言',
  },

  DEFAULT_PROVIDER: 'qianwen',
  DEFAULT_TEMPERATURE: 0.7,

  // AI 提示词配置
  PROMPTS: {
    // 系统角色提示词
    SYSTEM: {
      explain:
        '你是一个专业的阅读助手，对作品《{book}》以及作者{author}非常熟悉，擅长用通俗易懂的方式解释复杂的概念和术语。请确保解释简洁明了，并在必要时提供相关的背景信息。',
      digest:
        '你是一个专业的阅读助手，对作品《{book}》以及作者{author}非常熟悉，擅长提炼文章的核心观点，' +
        '分析其思想流派，阐述相关的历史演进，并能用通俗易懂的方式表达出来，保证内容既专业又易于理解。',
      analyze:
        '你是一个客观的分析助手，对作品《{book}》以及作者{author}非常熟悉，擅长从多个角度分析问题。' +
        '请提供支持和反对的论据，引用相关学者观点或研究，并提供进一步阅读的参考资料。分析要求客观、全面、有理有据。',
      chat:
        '你是一个专业的阅读助手，对作品《{book}》以及作者{author}非常熟悉，擅长用通俗易懂的方式解释复杂的概念和术语。' +
        '请确保解释简洁明了，并在必要时提供相关的背景信息。',
    },

    // 用户提示词模板
    USER: {
      explain:
        '我正在阅读{author}的《{book}》，其中提到的"{text}"我不了解，请使用通俗易懂的语言解释一下',
      digest:
        '我正在阅读{author}的《{book}》，对于书中的这段内容不是很理解，请使用通俗易懂的语言帮我理解并消化，' +
        '看以从核心观点、思想流派和历史演进等方面进行分析：\n\n{text}',
      analyze:
        '我正在阅读{author}的《{book}》，对于书中的这个说法有些疑惑，请从多个角度分析以下观点，包括支持和反对的论据，并引用相关学者或研究：\n\n{text}',
      chat: '这是我们之前的谈话记录\n{context}\n\n请根据这些信息继续回答我的问题：\n{text}',
    },
  },
};
