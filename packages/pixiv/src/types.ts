export namespace PixivAppApi {
  export type ImageSize = 'original' | 'large' | 'medium' | 'square_medium'
  export type Filter = 'for_ios'
  export type Type = 'illust' | 'manga'
  export type Restrict = 'public' | 'private'
  export type Content_type = 'illust' | 'manga'
  export type Mode =
    | 'day'
    | 'week'
    | 'month'
    | 'day_male'
    | 'day_female'
    | 'week_original'
    | 'week_rookie'
    | 'day_manga'
    | 'day_r18'
    | 'day_male_r18'
    | 'day_female_r18'
    | 'week_r18'
    | 'week_r18g'

  export type SearchTarget = 'partial_match_for_tags' | 'exact_match_for_tags' | 'title_and_caption' | 'keyword'
  export enum SearchAIType {
    SHOW_AI = 0,
    HIDE_AI = 1,
  }
  export type Sort = 'date_desc' | 'date_asc' | 'popular_desc'
  export type Duration = 'within_last_day' | 'within_last_week' | 'within_last_month'

  export interface SearchParams {
    word: string
    search_target: SearchTarget
    search_ai_type?: SearchAIType
    sort?: Sort
    filter: Filter
    duration?: Duration
    offset?: number
  }

  export interface RecommendParams {
    content_type: Content_type
    include_ranking_label?: boolean
    filter: Filter
  }

  export interface Result {
    illusts: Illust[]
  }

  export interface Illust {
    id: number
    title: string
    type: string
    image_urls: ImageUrls
    caption: string
    restrict: number
    user: User
    tags: Tag[]
    tools: string[]
    create_date: string
    page_count: number
    width: number
    height: number
    sanity_level: number
    /**
     * - 0: Safe
     * - 1: R18
     * - 2: R18G
     */
    x_restrict: number
    series: unknown
    meta_single_page: MetaSinglePage
    meta_pages: { image_urls: { original: string } & ImageUrls }[]
    total_view: number
    total_bookmarks: number
    is_bookmarked: boolean
    visible: boolean
    is_muted: boolean
    /**
     * - 0: Original
     * - 1: Unknown?
     * - 2: AI generated
     */
    illust_ai_type: 0 | 1 | 2
    /**
     * TODO: What is this?
     *
     * - 0: Illust
     * - 1: Manga
     * - 2: Ugoira
     * - 3: Novel
     */
    illust_book_style: number
  }

  export interface ImageUrls {
    square_medium: string
    medium: string
    large: string
  }

  export interface User {
    id: number
    name: string
    account: string
    profile_image_urls: ProfileImageUrls
    is_followed: boolean
  }

  export interface ProfileImageUrls {
    medium: string
  }

  export interface Tag {
    name: string
    translated_name?: string
  }

  export type MetaSinglePage = Record<`${ImageSize}_image_url`, string>
}
