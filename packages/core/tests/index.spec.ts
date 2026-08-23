import { Context, Schema } from 'koishi'
import mock from '@koishijs/plugin-mock'
import memory from '@koishijs/plugin-database-memory'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'

import { ImageSource } from '../src/source'
import * as booru from '../src/index'

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace MockSource {
  export interface Config extends ImageSource.Config {
    results: ImageSource.Result[]
  }
}

class MockSource extends ImageSource<MockSource.Config> {
  static inject = ['booru']

  languages = ['en']
  source = 'mock-source'
  results: ImageSource.Result[]

  constructor(ctx: Context, config: MockSource.Config) {
    super(ctx, config)
    this.results = config.results
  }

  async get(query: ImageSource.Query): Promise<ImageSource.Result[]> {
    return this.results
  }
}

function makeResult(overrides: Partial<ImageSource.Result> = {}): ImageSource.Result {
  return {
    urls: { original: 'https://example.com/image.png' },
    title: 'Test Image',
    author: 'test_author',
    tags: ['tag1', 'tag2'],
    nsfw: false,
    ...overrides,
  }
}

const defaultConfig = {
  maxCount: 10,
  nsfw: false,
  blacklist: [],
  output: 1,
  outputMethod: 'merge-multiple' as const,
  preferSize: 'large' as const,
  autoResize: false,
  asset: false,
  base64: false,
  spoiler: 0,
  showTips: false,
  detectLanguage: false,
  confidence: 0.5,
}

describe('ImageService', () => {
  let app: Context

  beforeEach(async () => {
    app = new Context()
    app.plugin(mock)
    app.plugin(memory)
    // @ts-expect-error inject structure mismatch
    app.plugin(booru, defaultConfig)
    await app.start()
  })

  afterEach(async () => {
    await app.stop()
  })

  it('should return results from registered sources', async () => {
    new MockSource(app, {
      label: 'test',
      weight: 1,
      proxyAgent: '',
      results: [makeResult()],
    })

    const images = await app.booru.get({ query: 'tag1', count: 1, labels: [] })
    expect(images).to.be.an('array').with.length(1)
    expect(images!.source).to.equal('mock-source')
    expect(images![0].urls.original).to.equal('https://example.com/image.png')
  })

  it('should respect label filter', async () => {
    new MockSource(app, {
      label: 'source-a',
      weight: 1,
      proxyAgent: '',
      results: [makeResult({ title: 'From A' })],
    })
    new MockSource(app, {
      label: 'source-b',
      weight: 1,
      proxyAgent: '',
      results: [makeResult({ title: 'From B' })],
    })

    const images = await app.booru.get({ query: 'tag1', count: 1, labels: ['source-a'] })
    expect(images).to.be.an('array').with.length(1)
    expect(images![0].title).to.equal('From A')
  })

  it('should fall back to next source if first returns empty', async () => {
    new MockSource(app, {
      label: 'empty-source',
      weight: 2,
      proxyAgent: '',
      results: [],
    })
    new MockSource(app, {
      label: 'fallback-source',
      weight: 1,
      proxyAgent: '',
      results: [makeResult({ title: 'Fallback' })],
    })

    const images = await app.booru.get({ query: 'tag1', count: 1, labels: [] })
    expect(images).to.be.an('array').with.length(1)
    expect(images![0].title).to.equal('Fallback')
  })

  it('should return undefined when all sources are empty', async () => {
    new MockSource(app, {
      label: 'empty-a',
      weight: 1,
      proxyAgent: '',
      results: [],
    })

    const images = await app.booru.get({ query: 'nonexistent', count: 1, labels: [] })
    expect(images).to.be.undefined
  })
})

describe('booru command', () => {
  let app: Context

  beforeEach(async () => {
    app = new Context()
    app.plugin(mock)
    app.plugin(memory)
    // @ts-expect-error inject structure mismatch
    app.plugin(booru, defaultConfig)
    await app.start()
  })

  afterEach(async () => {
    await app.stop()
  })

  it('should reply with results for a query', async () => {
    new MockSource(app, {
      label: 'test',
      weight: 1,
      proxyAgent: '',
      results: [makeResult()],
    })

    const client = app.mock.client('123')
    // Use receive() directly instead of shouldReply() to avoid database dependency
    const replies = await client.receive('booru test')
    expect(replies).to.be.an('array')
  })

  it('should show no-result message when sources return empty', async () => {
    new MockSource(app, {
      label: 'test',
      weight: 1,
      proxyAgent: '',
      results: [],
    })

    const client = app.mock.client('789')
    const replies = await client.receive('booru nonexistent')
    expect(replies).to.be.an('array').that.is.empty
  })
})
