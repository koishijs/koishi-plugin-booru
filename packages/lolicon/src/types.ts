export namespace Lolicon {
  export type Size = 'original' | 'regular' | 'small' | 'thumb' | 'mini'

  export interface Request {
    /**
     * 0为非 R18，1为 R18，2为混合（在库中的分类，不等同于作品本身的 R18 标识）
     * @default 0
     */
    r18?: number
    /**
     * 一次返回的结果数量，范围为1到20；在指定关键字或标签的情况下，结果数量可能会不足指定的数量
     * @default 1
     */
    num?: number
    /** 返回指定uid作者的作品，最多20个 */
    uid?: number[]
    /** 返回从标题、作者、标签中按指定关键字模糊匹配的结果，大小写不敏感，性能和准度较差且功能单一，建议使用tag代替 */
    keyword?: string
    /** 返回匹配指定标签的作品 */
    tag?: string[]
    /**
     * 返回指定图片规格的地址
     * @default ["original"]
     */
    size?: string[]
    /**
     * 设置图片地址所使用的在线反代服务
     * @default 'i.pixiv.re'
     */
    proxy?: string
    /** 返回在这个时间及以后上传的作品；时间戳，单位为毫秒 */
    dateAfter?: number
    /** 返回在这个时间及以前上传的作品；时间戳，单位为毫秒 */
    dateBefore?: number
    /**
     * 禁用对某些缩写keyword和tag的自动转换
     * @default false
     */
    dsc?: boolean
    /**
     * 排除 AI 作品
     * @default false
     */
    excludeAI?: boolean
  }

  /**
   * @see https://api.lolicon.app/#/setu?id=setu
   */
  export interface Setu {
    /** 作品 pid */
    pid:	number
    /** 作品所在页 */
    p:	number
    /** 作者 uid */
    uid:	number
    /** 作品标题 */
    title:	string
    /** 作者名（入库时，并过滤掉 @ 及其后内容） */
    author:	string
    /** 是否 R18（在库中的分类，不等同于作品本身的 R18 标识） */
    r18:	boolean
    /** 原图宽度 px */
    width:	number
    /** 原图高度 px */
    height:	number
    /** 作品标签，包含标签的中文翻译（有的话） */
    tags:	string[]
    /** 图片扩展名 */
    ext:	string
    /** 是否是 AI 作品，0 未知（旧画作或字段未更新），1 不是，2 是 */
    aiType:	number
    /** 作品上传日期；时间戳，单位为毫秒 */
    uploadDate:	number
    /** 包含了所有指定size的图片地址 */
    urls:	Record<Size, string>
  }

  export interface Response {
    /** 错误信息 */
    error: string
    /** 色图数组 */
    data: Setu[]
  }
}
