'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Funnel } from '@phosphor-icons/react';

import { Container } from '@/components/ui/container';
import { ContentGrid } from '@/components/ui/grid';
import { Pagination } from '@/components/ui/pagination';
import {
  SeriesCard,
  ClipCard,
  TutorialCard,
  VideoCardSkeletonGrid,
  type AgeCategory,
} from '@/components/content';
import { useContentList, useCategoryDetail } from '@/hooks/use-content';
import { cn } from '@/lib/utils';

type ContentTab = 'all' | 'series' | 'clips' | 'tutorials';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = React.useState<ContentTab>('all');
  const [currentPage, setCurrentPage] = React.useState(1);

  const { data: categoryData } = useCategoryDetail(slug);
  const categoryName = categoryData?.name || slug;

  const contentType = activeTab === 'all' ? undefined : activeTab === 'series' ? 'SERIES' : activeTab === 'clips' ? 'CLIP' : 'TUTORIAL';

  const { data, isLoading } = useContentList({
    categoryId: categoryData?.id,
    type: contentType,
    page: currentPage,
    limit: 20,
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const seriesItems = items.filter((i) => i.contentType === 'SERIES').map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
    seasonCount: item.seasonCount || 1,
    episodeCount: item.episodeCount || 1,
    ageCategory: (item.ageCategory || '0+') as AgeCategory,
    rating: item.rating,
    year: item.year,
  }));

  const clipItems = items.filter((i) => i.contentType === 'CLIP').map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
    duration: item.duration,
    viewCount: item.viewCount,
    ageCategory: (item.ageCategory || '0+') as AgeCategory,
    category: typeof item.category === 'object' && item.category !== null ? item.category.name : item.category,
  }));

  const tutorialItems = items.filter((i) => i.contentType === 'TUTORIAL').map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
    lessonCount: item.lessonCount || 0,
    completedLessons: item.completedLessons || 0,
    ageCategory: (item.ageCategory || '0+') as AgeCategory,
    category: typeof item.category === 'object' && item.category !== null ? item.category.name : item.category,
    instructor: item.instructor,
  }));

  const tabs: { value: ContentTab; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'series', label: 'Сериалы' },
    { value: 'clips', label: 'Клипы' },
    { value: 'tutorials', label: 'Обучение' },
  ];

  const showSeries = activeTab === 'all' ? seriesItems.length > 0 : activeTab === 'series';
  const showClips = activeTab === 'all' ? clipItems.length > 0 : activeTab === 'clips';
  const showTutorials = activeTab === 'all' ? tutorialItems.length > 0 : activeTab === 'tutorials';

  return (
    <Container size="full" className="py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-mp-text-primary">{categoryName}</h1>
        <p className="text-sm text-mp-text-secondary mt-1">
          {total} результатов в категории
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-mp-border mb-6">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setCurrentPage(1);
              }}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.value
                  ? 'border-mp-accent-primary text-mp-accent-primary'
                  : 'border-transparent text-mp-text-secondary hover:text-mp-text-primary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <VideoCardSkeletonGrid count={12} variant="series" columns={5} />
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Funnel className="w-12 h-12 text-mp-text-disabled mb-4" />
          <h3 className="text-lg font-medium text-mp-text-primary mb-2">
            Контент не найден
          </h3>
          <p className="text-mp-text-secondary">
            В данной категории пока нет контента
          </p>
        </div>
      ) : (
        <>
          {/* Series */}
          {showSeries && seriesItems.length > 0 && (
            <section className="mb-8">
              {activeTab === 'all' && (
                <h2 className="text-lg font-semibold text-mp-text-primary mb-4">Сериалы</h2>
              )}
              <ContentGrid>
                {seriesItems.map((series) => (
                  <SeriesCard key={series.id} content={series} />
                ))}
              </ContentGrid>
            </section>
          )}

          {/* Clips */}
          {showClips && clipItems.length > 0 && (
            <section className="mb-8">
              {activeTab === 'all' && (
                <h2 className="text-lg font-semibold text-mp-text-primary mb-4">Клипы</h2>
              )}
              <ContentGrid>
                {clipItems.map((clip) => (
                  <ClipCard key={clip.id} content={clip} />
                ))}
              </ContentGrid>
            </section>
          )}

          {/* Tutorials */}
          {showTutorials && tutorialItems.length > 0 && (
            <section className="mb-8">
              {activeTab === 'all' && (
                <h2 className="text-lg font-semibold text-mp-text-primary mb-4">Обучение</h2>
              )}
              <ContentGrid>
                {tutorialItems.map((tutorial) => (
                  <TutorialCard key={tutorial.id} content={tutorial} />
                ))}
              </ContentGrid>
            </section>
          )}

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </Container>
  );
}
