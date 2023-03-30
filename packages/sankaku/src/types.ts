export declare namespace SankakuComplex {
  export interface Response {
    id: number
    rating: string
    status: string
    author: Author
    sample_url: string
    sample_width: number
    sample_height: number
    preview_url: string
    preview_width: number
    preview_height: number
    file_url: string
    width: number
    height: number
    file_size: number
    file_type: string
    created_at: Createdat
    has_children: boolean
    has_comments: boolean
    has_notes: boolean
    is_favorited: boolean
    user_vote?: any
    md5: string
    parent_id?: any
    change: number
    fav_count: number
    recommended_posts: number
    recommended_score: number
    vote_count: number
    total_score: number
    comment_count?: any
    source: string
    in_visible_pool: boolean
    is_premium: boolean
    is_rating_locked: boolean
    is_note_locked: boolean
    is_status_locked: boolean
    redirect_to_signup: boolean
    sequence?: any
    generation_directives?: any
    tags: Tag[]
    video_duration?: any
  }
  interface Tag {
    id: number
    name_en: string
    name_ja?: string
    type: number
    count: number
    post_count: number
    pool_count: number
    locale: string
    rating?: string
    version?: number
    tagName: string
    total_post_count: number
    total_pool_count: number
    name: string
  }
  interface Createdat {
    json_class: string
    s: number
    n: number
  }
  interface Author {
    id: number
    name: string
    avatar: string
    avatar_rating: string
  }
}
