import './fetch-polyfill'

import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandOutput,
  Message
} from '@aws-sdk/client-bedrock-runtime'
import {info, warning} from '@actions/core'
import pRetry from 'p-retry'
import {BedrockOptions, Options} from './options'

// define type to save parentMessageId and conversationId
export interface Ids {
  parentMessageId?: string
  conversationId?: string
}

export class Bot {
  private readonly client: BedrockRuntimeClient

  private readonly options: Options
  private readonly bedrockOptions: BedrockOptions

  constructor(options: Options, bedrockOptions: BedrockOptions) {
    this.options = options
    this.bedrockOptions = bedrockOptions
    this.client = new BedrockRuntimeClient({})
  }

  chat = async (message: string, prefix?: string): Promise<[string, Ids]> => {
    let res: [string, Ids] = ['', {}]
    try {
      res = await this.chat_([
        {
          role: 'user',
          content: [
            {
              text: `${message}\n${prefix ?? ''}`
            }
          ]
        }
      ])
      return res
    } catch (e: unknown) {
      warning(`Failed to chat: ${e}`)
      return res
    }
  }

  roleplayChat = async (prompt: Array<Message>): Promise<[string, Ids]> => {
    try {
      return await this.chat_(prompt)
    } catch (e: unknown) {
      warning(`Failed to chat: ${e}`)
      return ['', {}]
    }
  }

  private readonly chat_ = async (
    prompt: Array<Message>
  ): Promise<[string, Ids]> => {
    // record timing
    const start = Date.now()
    if (!prompt.length) {
      return ['', {}]
    }

    let response: ConverseCommandOutput | undefined
    try {
      if (this.options.debug) {
        info(`sending prompt: ${JSON.stringify(prompt)}\n------------`)
      }
      response = await pRetry(
        () =>
          this.client.send(
            new ConverseCommand({
              modelId: this.bedrockOptions.model,
              messages: prompt,
              inferenceConfig: {
                maxTokens: 4096,
                temperature: 0
              }
            })
          ),
        {
          retries: this.options.bedrockRetries
        }
      )
    } catch (e: unknown) {
      info(`response: ${response}, failed to send message to bedrock: ${e}`)
    }
    const end = Date.now()
    info(
      `bedrock sendMessage (including retries) response time: ${end - start} ms`
    )

    let responseText = ''
    if (response?.output?.message != null) {
      responseText = response.output?.message.content?.at(-1)?.text ?? ''
    } else {
      warning('bedrock response is null')
    }
    if (this.options.debug) {
      info(`bedrock responses: ${responseText}\n-----------`)
    }
    const newIds: Ids = {
      parentMessageId: response?.$metadata.requestId,
      conversationId: response?.$metadata.cfId
    }
    return [responseText, newIds]
  }
}
