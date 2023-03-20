export namespace PixivAppApi {
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

  export type Search_target = 'partial_match_for_tags' | 'exact_match_for_tags' | 'title_and_caption' | 'keyword'

  export type Sort = 'date_desc' | 'date_asc' | 'popular_desc'
  export type Duration = 'within_last_day' | 'within_last_week' | 'within_last_month'
}
