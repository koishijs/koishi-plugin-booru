import { basename, extname } from 'path'

import { LocalStorage, Scraper } from './types'

const element = {
  filename: '(.+)',
  tag: '(\\[.+\\])',
}

const nsfw = [true, false, 'furry', 'guro', 'shota', 'bl']
// type Nsfw = boolean | 'furry' | 'guro' | 'shota' | 'bl'

const format = {
  filename: (name: string) => name,
  tag: (tags: string) =>
    tags
      .slice(1, -1)
      .replace('，', ',')
      .split(',')
      .map((s) => s.trim()),
  nsfw: (tag: string) => nsfw.includes(tag.split('=')[1]),
}

const mapping = {
  filename: 'name',
  tag: 'tags',
}

function name(scraper: string, path: string, hash: string): LocalStorage.Response {
  const filename = basename(path, extname(path))
  scraper = scraper.toLowerCase()

  const start = scraper.charAt(0) === '.' ? '^\\.' : '^'
  const end = scraper.charAt(-1) === '+' ? '(.+)' : '$'
  const pattren = scraper
    .replace(/^\./gm, '')
    .replace(/\+$/gm, '')
    .split('-')
    .map((k) => k.slice(1, -1))
    .filter((k) => Object.keys(element).includes(k))

  const rule = new RegExp(start + pattren.map((key) => element[key]).join('-') + end, 'g')
  const unitData = rule.exec(filename)
  return Object.fromEntries([
    ...(unitData === null
      ? [
          ['name', filename],
          ['tags', []],
        ]
      : pattren.map((k, i) => [mapping[k], format[k](unitData[i + 1])])),
    ['hash', hash],
    ['path', path],
  ])
}

// TODO: get from meta information in image file
function meta(scraper: string, path: string, hash: string): LocalStorage.Response {
  return { name: basename(path, extname(path)), hash, path }
}

export function scraper<T extends Scraper.String>(scraper: T) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const func: Record<Scraper.Type, Function> = { name, meta }
  const typer = /^\#(.+)#(.+)/.exec(scraper)
  if (typer === null) return (path: string, hash: string) => name(scraper, path, hash)
  else return (path: string, hash: string) => func[typer[1]](typer[2], path, hash)
}
