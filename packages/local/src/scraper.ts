import { basename, extname } from 'path'

import { ImageMetadata, Scraper } from './types'

export const NSFW_TOKENS = ['furry', 'guro', 'shota', 'bl']
export const SEPARATORS = ['-']

/**
 * Scraper configuration interface.
 */
export const tokenDefinitions: Scraper.TokenDefinitions = {
  filename: {
    matcher: '(.+?)',
    formatter: (name: string) => name,
  },
  author: {
    matcher: '(.+?)',
    formatter: (author: string) => author,
  },
  tag: {
    matcher: '(\\[[^\\]]+\\])',
    formatter: (tags: string) =>
      tags.slice(1, -1)
        .replace(/，/g, ',')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
  },
  nsfw: {
    matcher: `(nsfw|nsfw=(?:true|false|${NSFW_TOKENS.join('|')}))`,
    formatter: (tag: string) => {
      if (tag === 'nsfw') return true
      const value = tag.split('=')[1]
      return ['true', 'false'].includes(value) ? value === 'true' : value
    },
  },
}

// #region Scraper Patterns

export const patternsKeys: Scraper.TokenKeys[] = Object.keys(tokenDefinitions) as Scraper.TokenKeys[]

const scraperStrategies: Scraper.Strategies = {
  name: (scraper: string, path: string, hash: string) => {
    scraper = scraper.toLowerCase()
    const typeMatch = scraper.match(/^#(\w+)#/)
    scraper = typeMatch ? scraper.slice(typeMatch[0].length) : scraper
    const filename = basename(path, extname(path))
    const separator = SEPARATORS.find((sep) => scraper.includes(sep)) || SEPARATORS[0]

    const regex = createRegexPattern(scraper, separator, tokenDefinitions)
    const match = regex.exec(filename)

    const tokenizer = scraper
      .replace(/^\./gm, '')
      .replace(/\+$/gm, '')
      .split(separator)
      .filter(part => part.startsWith('{') && part.endsWith('}'))
      .map(part => part.slice(1, -1))

    const extraObject = match
      ? tokenizer.map((key, index) => {
        const patternKey = Object.keys(tokenDefinitions).find(k => key === k)
        if (!patternKey || !match[index + 1]) return null
        return [patternKey, tokenDefinitions[patternKey].formatter(match[index + 1])]
      }).filter(Boolean)
      : []

    const result = Object.fromEntries([
      ['name', filename],
      ['hash', hash],
      ...extraObject,
    ])

    return Object.assign(result, {
      ...result,
      sourcePath: path,
      tags: Array.isArray(result.tag) ? result.tag : [],
      nsfw: !!result.nsfw,
    }) as ImageMetadata
  },
  meta: (scraper: string, path: string, hash: string) => {
    return { name: basename(path, extname(path)), hash, sourcePath: path, tags: [], nsfw: false }
  },
}

function createRegexPattern(scraperPattern: string, separator: string, patterns: Scraper.TokenDefinitions) {
  const prefixMatch = scraperPattern.match(/^#(\w+)#/)
  const cleanPattern = prefixMatch ? scraperPattern.slice(prefixMatch[0].length) : scraperPattern
  const startWith = cleanPattern.startsWith('.') ? '^\\.' : '^'
  const endWith = cleanPattern.endsWith('+') ? '(.+)' : '$'
  const patternWithoutPrefix = cleanPattern.replace(/^\./, '')
  const hasPlusSuffix = cleanPattern.endsWith('+')
  const lastToken = patternWithoutPrefix
    .replace(/\+$/, '')
    .split(new RegExp(SEPARATORS.join('|')))
    .pop() || ''
  const shouldIgnorePlus = lastToken === '{filename}' && hasPlusSuffix
  const patternWithoutSuffix = shouldIgnorePlus
    ? patternWithoutPrefix
    : patternWithoutPrefix.replace(/\+$/, '')
  const parts = patternWithoutSuffix.split(new RegExp(SEPARATORS.join('|')))

  const regexParts = parts.map(part => {
    if (part.startsWith('{') && part.endsWith('}')) {
      const tokenName = part.slice(1, -1)
      return patterns[tokenName]?.matcher || '(.+?)'
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  })

  return new RegExp(startWith + regexParts.join(separator) + endWith)
}

export function scraper<T extends Scraper.String>(scraper: T): {
  (path: string, hash: string): ImageMetadata
} {
  const type = scraper.startsWith('#') ? scraper.split('#')[1] as Scraper.Type : 'name'
  const format = scraperStrategies[type] || scraperStrategies.name
  return (path: string, hash: string) => format(scraper, path, hash)
}

// #endregion
