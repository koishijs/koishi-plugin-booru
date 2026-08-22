export interface XbooruPost {
  id: number
  hash: string
  directory: number
  image: string
  change: number
  width: number
  height: number
  score: number
  owner: string
  parent_id: number
  rating: string
  sample: boolean
  sample_height: number
  sample_width: number
  preview_url: string
  sample_url: string
  file_url: string
  tags: string
  source: string
  status: string
  has_notes: boolean
  comment_count: number
}
