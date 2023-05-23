// server/api/webcard.ts

import { errorMessage } from '@starnexus/core/utils'
import { storageInfo } from '@starnexus/core/storage'
import type { WebInfoData } from '@starnexus/core'
import type { IDataStorage, IImageStorage, TStorage } from '@starnexus/core/storage'

export default eventHandler(async (event) => {
  try {
    const {
      webData,
      imgType,
      imgCfg,
      dataType,
      dataCfg,
      savedData,
    } = await readBody(event)
    // let imgRes: SavedImage
    const imgStorage = new (storageInfo[imgType.type as TStorage][imgType.name])(imgCfg) as IImageStorage
    const dataStorage = new (storageInfo[dataType.type as TStorage][dataType.name])(dataCfg) as IDataStorage
    const res = await createWebCard(webData as WebInfoData)
    // const imgQuery = await imgStorage.query(res.imgPath)
    // if (imgQuery.url)
    //   imgRes = await imgStorage.update(res)
    // else
    const imgRes = await imgStorage.create(res)

    const updateRes = await dataStorage.updateOgImage(savedData, imgRes.url)
    return updateRes
  }
  catch (error: any) {
    setResponseStatus(event, 400)

    const message = errorMessage(error)
    return { error: message }
  }
})
