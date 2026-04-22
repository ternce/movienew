'use client';

import { ArrowLeft, Plus, SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/admin/content/image-upload';
import { VideoUpload } from '@/components/admin/content/video-upload';
import { TagInput } from '@/components/studio/tag-input';
import { useCreateContent } from '@/hooks/use-admin-content';
import { useContentCategories, useContentTags } from '@/hooks/use-studio-data';

/**
 * Admin content creation page
 */
export default function AdminContentNewPage() {
  const router = useRouter();
  const createContent = useCreateContent();
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
  const [tagIds, setTagIds] = React.useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !contentType || !ageCategory || !description || !categoryId) {
      return;
    }

    createContent.mutate(
      {
        title,
        slug: slug || undefined,
        description,
        contentType,
        categoryId,
        ageCategory,
        thumbnailUrl: thumbnailUrl || undefined,
        previewUrl: previewUrl || undefined,
        isFree,
        individualPrice: individualPrice ? Number(individualPrice) : undefined,
        tagIds: tagIds.length ? tagIds : undefined,
      },
      {
        onSuccess: (data) => {
          router.push(`/admin/content/${data.id}`);
        },
      }
    );
  };

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
        title="Новый контент"
        description="Создание нового контента на платформе"
        breadcrumbItems={[
          { label: 'Контент', href: '/admin/content' },
          { label: 'Новый контент' },
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
                  <Label htmlFor="title">Название *</Label>
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
                    placeholder="Автоматически из названия"
                  />
                  <p className="text-xs text-mp-text-disabled">
                    Оставьте пустым для автоматической генерации
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание *</Label>
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
          </div>

          {/* Sidebar fields */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Настройки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Тип контента *</Label>
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
                  <Label>Категория возраста *</Label>
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
                  <Label>Тематика *</Label>
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
                    disabled={createContent.isPending}
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
                  disabled={createContent.isPending || !title || !contentType || !ageCategory || !description || !categoryId}
                >
                  {createContent.isPending ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Создать контент
                </Button>
                <p className="text-xs text-center text-mp-text-disabled">
                  Новый контент сохраняется как черновик
                </p>
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
