'use client';

import { ArrowLeft, FloppyDisk, SpinnerGap, Trash, X, Plus } from '@phosphor-icons/react';
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
import {
  useAdminProductDetail,
  useUpdateProduct,
  useDeleteProduct,
  useAdminCategories,
} from '@/hooks/use-admin-store';

/**
 * Admin edit product page
 */
export default function AdminStoreProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: product, isLoading } = useAdminProductDetail(id);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { data: categories } = useAdminCategories();

  // Form state
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [bonusPrice, setBonusPrice] = React.useState('');
  const [allowsPartialBonus, setAllowsPartialBonus] = React.useState(true);
  const [stockQuantity, setStockQuantity] = React.useState('');
  const [status, setStatus] = React.useState('DRAFT');
  const [imageUrl, setImageUrl] = React.useState('');
  const [images, setImages] = React.useState<string[]>([]);

  // Pre-fill form when product loads
  React.useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setCategoryId(product.categoryId || '');
      setPrice(String(product.price));
      setBonusPrice(product.bonusPrice != null ? String(product.bonusPrice) : '');
      setAllowsPartialBonus(product.allowsPartialBonus);
      setStockQuantity(String(product.stockQuantity));
      setStatus(product.status);
      setImages(product.images || []);
    }
  }, [product]);

  const handleAddImage = () => {
    const trimmed = imageUrl.trim();
    if (trimmed && !images.includes(trimmed)) {
      setImages((prev) => [...prev, trimmed]);
      setImageUrl('');
    }
  };

  const handleRemoveImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !price || !stockQuantity) {
      return;
    }

    updateProduct.mutate(
      {
        id,
        name,
        description: description || undefined,
        categoryId: categoryId || undefined,
        price: Number(price),
        bonusPrice: bonusPrice ? Number(bonusPrice) : undefined,
        allowsPartialBonus,
        stockQuantity: Number(stockQuantity),
        images: images.length > 0 ? images : undefined,
        status,
      },
      {
        onSuccess: () => {
          router.push('/admin/store/products');
        },
      }
    );
  };

  const handleDelete = () => {
    if (window.confirm(`Вы уверены, что хотите удалить товар "${name}"?`)) {
      deleteProduct.mutate(id, {
        onSuccess: () => {
          router.push('/admin/store/products');
        },
      });
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-5 w-96 mb-8" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </Container>
    );
  }

  // Not found
  if (!product) {
    return (
      <Container size="xl" className="py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/store/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к списку
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold text-mp-text-primary mb-2">
            Контент не найден
          </h2>
          <p className="text-mp-text-secondary">
            Товар с указанным ID не существует или был удалён.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container size="xl" className="py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/store/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      <AdminPageHeader
        title={`Редактирование: ${product.name}`}
        description="Изменение данных товара"
        breadcrumbItems={[
          { label: 'Товары', href: '/admin/store/products' },
          { label: product.name },
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
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите название товара"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Введите описание товара..."
                    rows={5}
                  />
                </div>
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
                  <Label>Категория</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Цена (руб.) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bonusPrice">Бонусная цена (руб.)</Label>
                  <Input
                    id="bonusPrice"
                    type="number"
                    value={bonusPrice}
                    onChange={(e) => setBonusPrice(e.target.value)}
                    placeholder="Необязательно"
                    min="0"
                    step="1"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowsPartialBonus"
                    checked={allowsPartialBonus}
                    onCheckedChange={(checked) =>
                      setAllowsPartialBonus(checked === true)
                    }
                  />
                  <Label htmlFor="allowsPartialBonus">
                    Частичная оплата бонусами
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Количество на складе *</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Черновик</SelectItem>
                      <SelectItem value="ACTIVE">Активен</SelectItem>
                      <SelectItem value="OUT_OF_STOCK">Нет в наличии</SelectItem>
                      <SelectItem value="DISCONTINUED">Снят</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Images */}
                <div className="space-y-2">
                  <Label>Изображения</Label>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://cdn.example.com/image.jpg"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImage();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddImage}
                      disabled={!imageUrl.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {images.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {images.map((url) => (
                        <div
                          key={url}
                          className="flex items-center gap-2 rounded-md bg-mp-surface px-3 py-1.5 text-xs"
                        >
                          <span className="flex-1 truncate text-mp-text-secondary">
                            {url}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="text-mp-text-disabled hover:text-mp-error-text transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    updateProduct.isPending ||
                    !name ||
                    !price ||
                    !stockQuantity
                  }
                >
                  {updateProduct.isPending ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FloppyDisk className="mr-2 h-4 w-4" />
                  )}
                  Сохранить изменения
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/admin/store/products">Отмена</Link>
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={handleDelete}
                  disabled={deleteProduct.isPending}
                >
                  {deleteProduct.isPending ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash className="mr-2 h-4 w-4" />
                  )}
                  Удалить товар
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Container>
  );
}
