export namespace Konachan {
  export interface Response {
    id: number
    tags: string
    created_at: number
    creator_id: number
    author: string
    change: number
    source: string
    score: number
    md5: string
    file_size: number
    file_url: string
    is_shown_in_index: boolean
    preview_url: string
    preview_width: number
    preview_height: number
    actual_preview_width: number
    actual_preview_height: number
    sample_url: string
    sample_width: number
    sample_height: number
    sample_file_size: number
    jpeg_url: string
    jpeg_width: number
    jpeg_height: number
    jpeg_file_size: number
    rating: string
    has_children: boolean
    parent_id?: number
    status: string
    width: number
    height: number
    is_held: boolean
    frames_pending_string: string
    frames_pending: unknown[]
    frames_string: string
    frames: unknown[]
  }
}
