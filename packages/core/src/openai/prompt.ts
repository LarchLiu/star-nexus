// https://github.com/sparticleinc/chatgpt-google-summary-extension/blob/main/src/content-script/prompt.ts

import GPT3Tokenizer from 'gpt3-tokenizer'

export enum ProviderType {
  ChatGPT = 'chatgpt',
  GPT3 = 'gpt3',
}

const tokenizer = new GPT3Tokenizer({ type: 'gpt3' })

export function getSummaryPrompt(transcript = '', providerConfigs?: ProviderType) {
  const text = transcript
    ? transcript
      .replace(/&#39;/g, '\'')
      .replace(/(\r\n)+/g, '\r\n')
      .replace(/(\s{2,})/g, ' ')
      .replace(/^(\s)+|(\s)$/g, '')
    : ''

  return truncateTranscript(text, providerConfigs)
}

// Seems like 15,000 bytes is the limit for the prompt
const textLimit = 14000
const limit = 1100 // 1000 is a buffer
const apiLimit = 2000

function truncateTranscript(str: string, providerConfigs?: ProviderType) {
  let textStr = str

  const textBytes = textToBinaryString(str).length
  if (textBytes > textLimit) {
    const ratio = textLimit / textBytes
    const newStr = str.substring(0, Math.floor(str.length * ratio))
    textStr = newStr
  }

  return truncateTranscriptByToken(textStr, providerConfigs)
}

function truncateTranscriptByToken(str: string, providerConfigs?: ProviderType) {
  const tokenLimit = providerConfigs === ProviderType.GPT3 ? apiLimit : limit

  // if (providerConfigs === ProviderType.GPT3) {
  const encoded: { bpe: number[]; text: string[] } = tokenizer.encode(str)
  const bytes = encoded.bpe.length

  if (bytes > tokenLimit) {
    const ratio = tokenLimit / bytes
    const newStr = str.substring(0, str.length * ratio)

    return newStr
  }

  return str
}

export function textToBinaryString(str: string) {
  const escstr = decodeURIComponent(encodeURIComponent(escape(str)))
  const binstr = escstr.replace(/%([0-9A-F]{2})/gi, (match, hex) => {
    const i = parseInt(hex, 16)
    return String.fromCharCode(i)
  })
  return binstr
}
