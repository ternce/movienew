'use client';

import { ArrowLeft, FloppyDisk, SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import * as React from 'react';

import { AdminPageHeader } from '@/components/admin/layout/admin-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/admin/content/image-upload';
import { VideoUpload } from '@/components/admin/content/video-upload';
import { TagInput } from '@/components/studio/tag-input';
import {
  useAdminContentDetail,
  useUpdateContent,
  AGE_CATEGORY_FROM_BACKEND,
} from '@/hooks/use-admin-content';
import { useContentCategories, useContentTags } from '@/hooks/use-studio-data';

/**
 * Admin content edit page
 */
export default function AdminContentEditPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;

  const { data: content, isLoading } = useAdminContentDetail(contentId);
  const updateContent = useUpdateContent();
  const { flat: categories } = useContentCategories();
  const { data: availableTags } = useContentTags();

  // Form state
  const [title, setTitle] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [contentType, setContentType] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [ageCategory, setAgeCategory] = React.useState('');
  const [thumbnailUrl, setThumbnailUrl] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [isFree, setIsFree] = React.useState(false);
  const [individualPrice, setIndividualPrice] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [tagIds, setTagIds] = React.useState<string[]>([]);

  // Populate form when data loads
  React.useEffect(() => {
    if (content) {
      // content may be wrapped in ApiResponse { success, data } or be the data directly
      const c = (content as { data?: Record<string, unknown> }).data ?? content;
      setTitle((c as { title?: string }).title || '');
      setSlug((c as { slug?: string }).slug || '');
      setDescription((c as { description?: string }).description || '');
      setContentType((c as { contentType?: string }).contentType || '');
      const catObj = (c as { category?: { id: string } }).category;
      setCategoryId((c as { categoryId?: string }).categoryId || catObj?.id || '');
      const rawAge = (c as { ageCategory?: string }).ageCategory || '';
      setAgeCategory(AGE_CATEGORY_FROM_BACKEND[rawAge] || rawAge);
      setThumbnailUrl((c as { thumbnailUrl?: string }).thumbnailUrl || '');
      setPreviewUrl((c as { previewUrl?: string }).previewUrl || '');
      setIsFree(!!(c as { isFree?: boolean }).isFree);
      const price = (c as { individualPrice?: number }).individualPrice;
      setIndividualPrice(price != null ? String(price) : '');
      setStatus((c as { status?: string }).status || '');

      const tags = (c as { tags?: Array<{ id: string }> }).tags;
      setTagIds(Array.isArray(tags) ? tags.map((t) => t.id).filter(Boolean) : []);
    }
  }, [content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateContent.mutate(
      {
        id: contentId,
        title,
        description: description || undefined,
        contentType: contentType || undefined,
        categoryId: categoryId || undefined,
        ageCategory: ageCategory || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        previewUrl: previewUrl || undefined,
        isFree,
        individualPrice: individualPrice ? Number(individualPrice) : undefined,
        tagIds,
        status: status || undefined,
      },
      {
        onSuccess: () => {
          router.push('/admin/content');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!content) {
    return (
      <Container size="xl" className="py-8">
        <Card className="py-12 text-center">
          <p className="text-mp-text-secondary">Контент не найден</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/admin/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Вернуться к списку
            </Link>
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/content">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title={title || 'Контент'}
        description={`Редактирование контента`}
        breadcrumbItems={[
          { label: 'Контент', href: '/admin/content' },
          { label: title || 'Контент' },
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3 mt-6">
          {/* Main fields */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Введите название"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="auto-generated-slug"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Введите описание контента..."
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Медиа</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImageUpload
                  label="Обложка"
                  description="Изображение обложки контента"
                  value={thumbnailUrl}
                  onChange={setThumbnailUrl}
                />

                <VideoUpload
                  label="Превью видео"
                  description="Короткое превью контента"
                  value={previewUrl}
                  onChange={setPreviewUrl}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Видео контент</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoUpload
                  contentId={contentId}
                  label="Основное видео"
                  description="Загрузите видео для транскодирования в HLS (MP4, WebM, MOV, MKV до 5GB)"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                  maxSizeMB={5120}
                  onChange={() => {}}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar fields */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Настройки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Тип контента</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERIES">Сериал</SelectItem>
                      <SelectItem value="CLIP">Клип</SelectItem>
                      <SelectItem value="SHORT">Шорт</SelectItem>
                      <SelectItem value="TUTORIAL">Туториал</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Категория возраста</Label>
                  <Select value={ageCategory} onValueChange={setAgeCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите возраст" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0+">0+</SelectItem>
                      <SelectItem value="6+">6+</SelectItem>
                      <SelectItem value="12+">12+</SelectItem>
                      <SelectItem value="16+">16+</SelectItem>
                      <SelectItem value="18+">18+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Черновик</SelectItem>
                      <SelectItem value="PENDING">На модерацию</SelectItem>
                      <SelectItem value="PUBLISHED">Опубликован</SelectItem>
                      <SelectItem value="REJECTED">Отклонён</SelectItem>
                      <SelectItem value="ARCHIVED">Архив</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Тематика</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите тематику" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.depth > 0 ? `${'— '.repeat(cat.depth)}${cat.name}` : cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Теги</Label>
                  <TagInput
                    value={tagIds}
                    onChange={setTagIds}
                    availableTags={availableTags ?? []}
                    placeholder="Добавить тег..."
                    disabled={updateContent.isPending}
                    maxTags={10}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Монетизация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFree"
                    checked={isFree}
                    onCheckedChange={(checked) => setIsFree(checked === true)}
                  />
                  <Label htmlFor="isFree">Бесплатный контент</Label>
                </div>

                {!isFree && (
                  <div className="space-y-2">
                    <Label htmlFor="individualPrice">Цена (руб.)</Label>
                    <Input
                      id="individualPrice"
                      type="number"
                      value={individualPrice}
                      onChange={(e) => setIndividualPrice(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateContent.isPending}
                >
                  {updateContent.isPending ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FloppyDisk className="mr-2 h-4 w-4" />
                  )}
                  Сохранить
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/admin/content">Отмена</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Container>
  );
}
