import { writeFile } from 'fs/promises'
import { resolve } from 'path'

import * as cheerio from 'cheerio'

const url = 'https://img.moehu.org/'

;(async () => {
  const response = await fetch(url)

  if (response.status === 200) {
    const $ = cheerio.load(await response.text())

    const menuDivs = $('.menuDiv').slice(0, -3)

    const keyMap: Record<string, string> = {}

    menuDivs.each((index, menu) => {
      const menuUl = $(menu).find('ul')
      menuUl.find('pre').each((_, pre) => {
        const match = /(?<name>.*)→.*id=(?<id>.*)">/g.exec($(pre).html() ?? '')
        if (match && match.groups) {
          const { name, id } = match.groups
          keyMap[name.trim()] = id.trim()
        }
      })
    })

    await writeFile(resolve(__dirname, '..', 'src', 'data', 'ids.json'), JSON.stringify(keyMap))
  }
})()
