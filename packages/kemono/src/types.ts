export interface KemonoResponse {
  count: number
  true_count: number
  posts: KemonoPost[]
}

export interface KemonoPost {
  id: string
  user: string
  service: string
  title: string
  substring?: string
  published: string
  file: {
    name?: string
    path?: string
  }
  attachments: {
    name?: string
    path?: string
  }[]
}
