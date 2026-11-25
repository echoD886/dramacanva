import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App, ConfigProvider } from 'antd';
import { LazyMotion, domAnimation } from 'motion/react';
import { getAntThemeConfig } from '@/lib/app-theme';
import UserLayout from '@/layouts/user-layout';
import { setAppLocale, type AppLocale } from '@/i18n/app-locale';
import { loadMessages } from '@/i18n/messages';
import { useAntLocale } from '@/i18n/antd-locale';
import { useActiveTheme } from '@/stores/canvas/use-canvas-theme-store';
const Home = lazy(() => import('@/pages/home'));
const Skills = lazy(() => import('@/pages/public-skills'));
const SkillLibrary = lazy(() => import('@/pages/skills'));
const Projects = lazy(() => import('@/pages/projects'));
const DramaCreate = lazy(() => import('@/pages/drama/create'));
const ProjectDetail = lazy(() => import('@/pages/projects/detail'));
const Canvas = lazy(() => import('@/pages/canvas'));
const CanvasProject = lazy(() => import('@/pages/canvas/project'));
const Templates = lazy(() => import('@/pages/ai-video-templates'));
const Template = lazy(() => import('@/pages/ai-video-templates/detail'));
const Assets = lazy(() => import('@/pages/assets'));
const Workbench = lazy(() => import('@/pages/workbench'));
const Pricing = lazy(() => import('@/pages/pricing'));
const Create = lazy(() => import('@/pages/create'));
const Models = lazy(() => import('@/pages/models'));
const Blog = lazy(() => import('@/pages/blog'));
const Article = lazy(() => import('@/pages/blog/article'));
const queryClient = new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
const workspace = [
  {path:'projects',element:<Projects/>}, {path:'projects/create',element:<DramaCreate/>},
  {path:'projects/:projectId/*',element:<ProjectDetail/>}, {path:'canvas',element:<Canvas/>},
  {path:'canvas/:id',element:<CanvasProject/>}, {path:'assets',element:<Assets/>},
  {path:'workbench',element:<Workbench/>}, {path:'create',element:<Create/>},
  {path:'skill-library',element:<SkillLibrary/>},
];
const publicRoutes=[{index:true,element:<Home/>},{path:'home',element:<Home/>},
  {path:'skills',element:<Skills/>},{path:'skills/:slug',element:<Skills/>},
  {path:'ai-video-templates',element:<Templates/>},{path:'ai-video-templates/:slug',element:<Template/>},
  {path:'pricing',element:<Pricing/>},{path:'models',element:<Models/>},
  {path:'blog',element:<Blog/>},{path:'blog/:slug',element:<Article/>}];
const router=createBrowserRouter([
  ...Object.entries({ '':'en-US', en:'en-US', zh:'zh-CN', hk:'zh-HK', tw:'zh-TW', ja:'ja-JP', ko:'ko-KR', es:'es-ES', pt:'pt-BR' }).map(([prefix, locale])=>({
    path:`/${prefix}`, children:publicRoutes,
    loader:async()=>{ setAppLocale(locale); await loadMessages(locale as AppLocale); return null; }
  })),
  {element:<UserLayout><Outlet/></UserLayout>,children:workspace},
  {path:'/drama',element:<Navigate to='/projects' replace/>},
  {path:'*',element:<main style={{padding:40}}><h1>Page not included</h1><a href='/'>Back to home</a></main>}
]);
export function PublicEntry(){
  const theme = useActiveTheme();
  const antLocale = useAntLocale();
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.style.colorScheme = theme; }, [theme]);
  return <LazyMotion features={domAnimation}><ConfigProvider locale={antLocale} theme={getAntThemeConfig(theme === 'dark')}><App><QueryClientProvider client={queryClient}><Suspense fallback={<p>Loading…</p>}><RouterProvider router={router}/></Suspense></QueryClientProvider></App></ConfigProvider></LazyMotion>;
}
