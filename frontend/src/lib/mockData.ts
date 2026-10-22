import type { Entry } from '../types/entry'
import { localDateFromInstant, shiftDate } from './datetime'

export function exampleEntries(): Entry[] {
  const today = localDateFromInstant()
  const examples: [number, Entry['type'], string, number?][] = [
    [0, 'NOTE', '下楼买咖啡时，发现路边的桂花开了。原来秋天已经悄悄来了。'],
    [0, 'ACTIVITY', '把没读完的那一章读完了。喜欢这种慢慢把注意力找回来的感觉。', 35],
    [0, 'MEAL', '午饭吃了番茄鸡蛋面，给自己多加了一把青菜。'],
    [-1, 'IDEA', '想做一本属于自己的季节小册子，把散步时看到的颜色都收集起来。'],
    [-2, 'NOTE', '和很久没见的朋友聊到天黑，没有特别的话题，却觉得很充电。'],
    [-4, 'ACTIVITY', '沿着河边走了很远，今天的夕阳值得多停留一会儿。', 40],
  ]
  return examples.map(([offset, type, content, durationMinutes], index) => {
    const date = shiftDate(today, offset)
    const instant = date + 'T' + (index === 0 ? '17:20' : index === 1 ? '15:10' : '12:30') + ':00+08:00'
    return { id: 'example-' + index, type, title: content.slice(0, 24), content, rawText: content,
      occurredAt: instant, localDate: date, source: 'MANUAL', aiAllowed: false,
      createdAt: instant, updatedAt: instant, version: 0, durationMinutes, isExample: true }
  })
}

// Legacy export retained for integrations; examples are only loaded after explicit user action.
export const demoEntries = exampleEntries()
