import { $fetch } from 'ofetch'
import type { GithubRepoMeta, NotionConfig, NotionPage, SavedNotion, SummarizeData, TwitterTweetMeta, WebInfoData } from '../types'
import { GITHUB_DOMAIN, NOTION_API_URL, TWITTER_DOMAIN } from '../const'

export class NotionStorage {
  constructor(fields: { config: { apiKey: string; databaseId: string }; data?: WebInfoData & SummarizeData }) {
    this.config = fields.config
    this.data = fields.data
  }

  private config
  private data

  async call(data?: WebInfoData & SummarizeData) {
    if (!data && !this.data)
      throw new Error('DataStorage error: No Storage Data')

    const storageData = (data || this.data)!

    const notion: NotionPage = {
      title: storageData.title,
      summary: storageData.summary,
      url: storageData.url,
      categories: storageData.categories,
      status: 'Starred',
      meta: storageData.meta,
    }
    return await saveToNotion(this.config, notion)
  }
}

export async function saveToNotion(config: NotionConfig, info: NotionPage): Promise<SavedNotion> {
  const apiKey = config.apiKey
  let catOpt = [{
    name: 'Others',
  }]

  catOpt = info.categories.map((item) => {
    item = item.trim()
    if (item.endsWith('.'))
      item = item.slice(0, -1)

    return {
      name: item,
    }
  })

  const body: Record<string, any> = {
    parent: {
      database_id: config.databaseId,
    },
    properties: {
      Title: {
        title: [
          {
            text: {
              content: info.title,
            },
          },
        ],
      },
      Summary: {
        rich_text: [
          {
            text: {
              content: info.summary,
            },
          },
        ],
      },
      URL: {
        url: info.url,
      },
      Categories: {
        multi_select: catOpt,
      },
      Status: {
        select: {
          name: 'Starred',
        },
      },
    },
  }
  let cover = ''
  if (info.meta && Object.keys(info.meta).length > 0) {
    const meta = info.meta
    if (meta.cover) {
      cover = meta.cover
      body.properties = {
        ...body.properties,
        Cover: {
          url: cover,
        },
      }
    }
    body.properties = {
      ...body.properties,
      Website: {
        select: {
          name: meta.siteName,
        },
      },
    }
    if (info.meta.domain === GITHUB_DOMAIN) {
      const github = meta as GithubRepoMeta
      if (github.languages) {
        const languages = github.languages.map((lang) => {
          return {
            name: lang,
          }
        })
        body.properties = {
          ...body.properties,
          Languages: {
            multi_select: languages,
          },
        }
      }
      if (github.tags) {
        const tags = github.tags.map((tag) => {
          return {
            name: tag,
          }
        })
        body.properties = {
          ...body.properties,
          Tags: {
            multi_select: tags,
          },
        }
      }
    }
    else if (info.meta.domain === TWITTER_DOMAIN) {
      const twitter = meta as TwitterTweetMeta
      if (twitter.tags) {
        const tags = twitter.tags.map((tag) => {
          return {
            name: tag,
          }
        })
        body.properties = {
          ...body.properties,
          Tags: {
            multi_select: tags,
          },
        }
      }
    }
  }

  // check notion page exists
  const checkData = await $fetch<any>(`${NOTION_API_URL}/databases/${config.databaseId}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: {
      filter: {
        property: 'URL',
        rich_text: {
          contains: info.url,
        },
      },
    },
  })

  let notionPageId = ''
  let starred = false
  if (checkData.results.length > 0) {
    if (checkData.results[0].properties.Status.select.name === 'Starred')
      starred = true
    notionPageId = checkData.results[0].id
  }

  if (notionPageId) {
    body.properties = {
      ...body.properties,
      Status: {
        select: {
          name: starred ? 'Unstarred' : 'Starred',
        },
      },
    }
    // update notion page info
    await $fetch(`${NOTION_API_URL}/pages/${notionPageId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body,
    })

    return { starred: !starred, notionPageId }
  }

  if (cover) {
    const imageBlock = {
      object: 'block',
      image: {
        external: {
          url: cover,
        },
      },
    }
    body.children = [imageBlock]
  }
  // create notion page
  const newPageResponse = await $fetch<any>(`${NOTION_API_URL}/pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
      'Authorization': `Bearer ${apiKey}`,
    },
    body,
  })

  notionPageId = newPageResponse.id // 获取新页面的 ID

  return { starred: !starred, notionPageId }
}
