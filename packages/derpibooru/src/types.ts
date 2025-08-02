export namespace Derpibooru {
  export interface RequestParams {
    q: string
    sf: 'random' | 'score' | 'created_at' | 'updated_at'
    limit?: number
    page?: number
    per_page?: number
    key?: string
    filter_id?: number
  }

  export interface ImagesResponse {
    images: ImageResponse[]
  }

  export interface ImageResponse {
    id: number
    animated: boolean
    aspect_ratio: number
    comment_count: number
    created_at: string
    deletion_reason: string | null
    description: string
    downvotes: number
    duplicate_of: number | null
    duration: number | null
    faves: number
    first_seen_at: string
    format: string
    height: number
    hidden_from_users: boolean
    intensities: Intensities | null
    mime_type: string
    name: string
    orig_sha512_hash: string
    processed: boolean
    representations: Record<
      'full' | 'large' | 'medium' | 'small' | 'tall' | 'thumb' | 'thumb_small' | 'thumb_tiny',
      string
    >
    score: number
    sha512_hash: string
    size: number
    source_url: string
    source_urls: string[]
    spoilered: boolean
    tag_count: number
    tag_ids: number[]
    tags: string[]
    thumbnails_generated: boolean
    updated_at: string
    uploader: string
    uploader_id: number
    upvotes: number
    view_url: string
    width: number
    wilson_score: number
  }

  export interface Intensities {
    nw: number
    ne: number
    sw: number
    se: number
  }
}
