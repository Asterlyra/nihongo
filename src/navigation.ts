import { House, BookOpen, Library, Headphones, ChartNoAxesColumnIncreasing, Settings } from 'lucide-react';

export const primaryNavigation = [
  { to: '/', title: '学习概览', shortTitle: '概览', icon: House },
  { to: '/study', title: '背单词', shortTitle: '背词', icon: BookOpen },
  { to: '/courses', title: '课程', shortTitle: '课程', icon: Library },
  { to: '/progress', title: '学习记录', shortTitle: '记录', icon: ChartNoAxesColumnIncreasing },
];
export const moreNavigation = [
  { to: '/kana', title: '发音工具', icon: Headphones },
  { to: '/settings', title: '设置与备份', icon: Settings },
];
const courseRoutes = ['/courses', '/words', '/plan', '/grammar', '/reading', '/dialogues'];
export function sectionActive(to: string, pathname: string) {
  if (to === '/') return pathname === '/';
  if (to === '/courses') return courseRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`));
  return pathname === to || pathname.startsWith(`${to}/`);
}
