export namespace Gelbooru {
  export interface Response {
    '@attributes': Attributes
    'post': Post[]
  }

  interface Post {
    id: number
    created_at: string
    score: number
    width: number
    height: number
    md5: string
    directory: string
    image: string
    rating: string
    source: string
    change: number
    owner: string
    creator_id: number
    parent_id?: number
    sample: number
    preview_height: number
    preview_width: number
    tags: string
    title: string
    has_notes: string
    has_comments: string
    file_url: string
    preview_url: string
    sample_url: string
    sample_height: number
    sample_width: number
    status: string
    post_locked: number
    has_children: string
  }

  interface Attributes {
    limit: number
    offset: number
    count: number
  }
}
