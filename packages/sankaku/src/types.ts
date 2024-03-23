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
    user_vote?: number
    md5: string
    parent_id?: number
    change: number
    fav_count: number
    recommended_posts: number
    recommended_score: number
    vote_count: number
    total_score: number
    comment_count?: number
    source: string
    in_visible_pool: boolean
    is_premium: boolean
    is_rating_locked: boolean
    is_note_locked: boolean
    is_status_locked: boolean
    redirect_to_signup: boolean
    sequence?: number
    generation_directives?: unknown
    tags: Tag[]
    video_duration?: number
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
  interface BaseUser {
    id: number
    name: string
    avatar: string
    avatar_rating: string
  }
  interface Author extends BaseUser {}
  interface User extends BaseUser {
    level: number
    upload_limit: number
    created_at: number
    favs_are_private: boolean
    avatar: string
    post_upload_count: number
    pool_upload_count: number
    comment_count: number
    post_update_count: number
    note_update_count: number
    wiki_update_count: number
    forum_post_count: number
    pool_update_count: number
    series_update_count: number
    tag_update_count: number
    artist_update_count: number
    last_logged_in_at?: number
    favorite_count?: number
    post_favorite_count?: number
    pool_favorite_count?: number
    vote_count?: number
    post_vote_count?: number
    pool_vote_count?: number
    recommended_posts_for_user?: number
    subscriptions?: string[]
  }
  export interface LoginResponse {
    access_token: string
    refresh_token: string
    token_type: string
    current_user: User
  }
}
