// eslint-disable-next-line camelcase
import {get_encoding} from '@dqbd/tiktoken'
import {Message} from '@aws-sdk/client-bedrock-runtime'

const tokenizer = get_encoding('cl100k_base')

export function encode(input: string): Uint32Array {
  return tokenizer.encode(input)
}

export function getTokenCount(input: string): number {
  input = input.replace(/<\|endoftext\|>/g, '')
  return encode(input).length
}

export function getTokenCountRolePlay(input: Array<Message>): number {
  const tokenCounts = input.map(message => {
    if (Array.isArray(message.content)) {
      return message.content.reduce((sum, part) => {
        if ('text' in part && typeof part.text === 'string') {
          return sum + encode(part.text.replace(/<\|endoftext\|>/g, '')).length
        }
        return sum
      }, 0)
    }
    return 0
  })

  return tokenCounts.reduce((total, count) => total + count, 0)
}
