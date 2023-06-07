import { h } from "koishi"

export function filterEmptyElement(elem: h[], type: string[]) {
  const filter = (elem: h) => {
    elem.children = elem.children.filter(filter)
    return !(!elem.children?.length && type.includes(elem.type))
  }
  return elem.filter(filter)
}
