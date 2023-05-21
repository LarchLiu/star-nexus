import { $fetch } from 'ofetch'
import type { GithubRepoMeta, TwitterTweetMeta, WebInfoData } from '@starnexus/core'
import type { StorageImage } from '@starnexus/core/storage'
import { unfurl } from 'unfurl.js'
import { errorMessage } from '@starnexus/core/utils'
import TweetCard from './TweetCard.vue'
import CommonCard from './CommonCard.vue'

// const SUPABASE_URL = process.env.SUPABASE_URL
// const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/pics-bed`

export async function createWebCard(webInfo: WebInfoData): Promise<StorageImage> {
  try {
    const webMeta = webInfo.meta
    let imgPath = ''
    let meta
    let props
    let card: Component | undefined
    let svg = ''
    let png: Blob | undefined
    const res = await unfurl(webInfo.url)

    if (webMeta.siteName === 'Github') {
      meta = webMeta as GithubRepoMeta
      imgPath = `${webMeta.domain}/${meta.username}/${meta.reponame}.png`
      if (res.open_graph && res.open_graph.images)
        png = await $fetch(res.open_graph.images[0].url, { responseType: 'blob' })
    }
    else if (webMeta.siteName === 'Twitter') {
      card = TweetCard
      meta = webMeta as TwitterTweetMeta
      const screenName = meta.screenName!
      const status = meta.status!
      imgPath = `${webMeta.domain}/${screenName}/${status}.svg`
      const content = meta.content!
      let contentArr = content.split('\n').filter((l: string) => l !== '').map((l: string, i: number) =>
        i < 7 ? l : '...')

      if (contentArr.length > 7)
        contentArr = contentArr.slice(0, 8)

      props = {
        avator: meta.avator,
        name: meta.name,
        screenName: meta.screenName,
        content: contentArr,
        pubTime: meta.pubTime,
        lang: meta.lang, // TODO: change to satori lang type
      }
    }
    else {
      card = CommonCard
      const content = webInfo.content || res.description || 'No Content'
      let contentArr = content.split('\n').filter((l: string) => l !== '').map((l: string, i: number) =>
        i < 7 ? l : '...')

      if (contentArr.length > 7)
        contentArr = contentArr.slice(0, 8)

      const faviconPath = res.favicon?.split('/')
      const favicon = (faviconPath && !faviconPath[faviconPath.length - 1].includes('.ico')) ? res.favicon : ''
      props = {
        title: res.title || webInfo.title,
        content: contentArr,
        favicon,
      }
      const url = webInfo.url.replace(/https?:\/\/[^/]+\/?/, '')
      const filename = url.replace(/[<|>|:|"|\\|\/|\.|?|*|#|&|%|~|'|"]/g, '')
      imgPath = `${webMeta.domain}/${filename}.svg`
    }

    if (!imgPath)
      throw new Error(`No image path for ${webMeta.siteName}`)

    // const storageResponse = await $fetch(`${STORAGE_URL}/${imgPath}?v=starnexus`)
    //   .then((_) => {
    //     return `${STORAGE_URL}/${imgPath}?v=starnexus`
    //   })
    //   .catch((_) => {
    //     return ''
    //   })
    // if (storageResponse) {
    //   return {
    //     url: storageResponse,
    //   }
    // }
    if (!png) {
      if (!card)
        throw new Error(`No WebCard template for ${webMeta.siteName}`)

      const fonts = await initBasicFonts()
      svg = await satori(card, {
        props,
        width: 1200,
        height: 630,
        fonts,
        loadAdditionalAsset: async (code, text) => loadDynamicAsset('twemoji', code, text),
      })
      return {
        imgData: svg,
        imgPath,
      }
    }
    // setHeader(event, 'Content-Type', 'image/svg+xml')

    return {
      imgData: png,
      imgPath,
    }

    // const supabaseAdminClient = createClient(
    //   process.env.SUPABASE_URL ?? '',
    //   process.env.SUPABASE_ANON_KEY ?? '',
    // )

    // // Upload image to storage.
    // if (svg) {
    //   const { error } = await supabaseAdminClient.storage
    //     .from(process.env.SUPABASE_STORAGE_BUCKET || 'pics-bed')
    //     .upload(imgPath, svg, {
    //       contentType: 'image/svg+xml',
    //       cacheControl: '31536000',
    //       upsert: true,
    //     })

    //   if (error)
    //     throw error

    //   return {
    //     url: `${STORAGE_URL}/${imgPath}?v=starnexusogimage`,
    //   }
    // }
    // else if (png) {
    //   const { error } = await supabaseAdminClient.storage
    //     .from(process.env.SUPABASE_STORAGE_BUCKET || 'pics-bed')
    //     .upload(imgPath, png, {
    //       contentType: 'image/svg+xml',
    //       cacheControl: '31536000',
    //       upsert: true,
    //     })

    //   if (error)
    //     throw error

    //   return {
    //     url: `${STORAGE_URL}/${imgPath}?v=starnexusogimage`,
    //   }
    // }
    // else {
    //   return {
    //     url: `${STORAGE_URL}/star-nexus.png?v=starnexusogimage`,
    //   }
    // }
  }
  catch (error) {
    const message = errorMessage(error)
    throw new Error(message)
  }
}
