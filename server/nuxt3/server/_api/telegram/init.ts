import { Cryption } from '@stargram/core/utils'
import { C1, C2 } from '../../../constants/index'
import type { BotConfig } from '../../utils'
import { getBotConfig, setBotConfig } from '../../utils'

const cryption = new Cryption(C1, C2)

export default eventHandler(async (event) => {
  const result: Record<string, any> = {}
  const encode = await readBody(event) as string
  const decode = cryption.decode(encode)
  const config = JSON.parse(decode)
  const domain = `${getRequestProtocol(event)}://${getRequestHost(event)}`
  const token = config.app.config.botToken.trim() as string
  const test = /(\d+:[A-Za-z0-9_-]{35})/.test(token)
  if (!test) {
    setResponseStatus(event, 400)
    return { error: 'Telegram Token Not Available' }
  }
  const url = `${domain}/api/telegram/${token}/webhook`
  const id = token.split(':')[0]
  result[id] = {
    webhook: await bindTelegramWebHook(token, url).catch(e => e.message),
    command: await bindCommandForTelegram(token).catch(e => e.message),
  }
  if (result[id].webhook.result) {
    const appConfig = await getBotConfig('telegram') as BotConfig
    appConfig[id] = { config: encode, userList: [] }
    if (!appConfig.default)
      appConfig.default = token

    setBotConfig('telegram', appConfig)
  }
  if (result[id].webhook.ok && result[id].command.ok)
    return 'success'

  setResponseStatus(event, 400)

  const message = (result[id].webhook.description || result[id].command.description)
  return { error: message }
})
